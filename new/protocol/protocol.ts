import { delay, writeAll } from '../../deps.ts';
import {
  ConnnectionError,
  ReadError,
  ResponseTimeoutError,
  WriteError,
} from '../constant/errors.ts';
import {
  ReceivePacket,
  ReceivePacketType,
  SendPacket,
} from './packets/base.ts';
import { ErrorBody } from './packets/error.ts';
import { TypedReader, TypedWriter } from './typedBuffer.ts';
import { readFull } from '../util.ts';

type Socket = Deno.Reader & Deno.Writer & Deno.Closer;

export class Protocol {
  #socket?: Socket;
  #timeout: number;
  #capabilities: number = 0;

  constructor(socket: Socket, timeout: number = 10000) {
    this.#socket = socket;
    this.#timeout = timeout;
  }

  #close() {
    this.#socket?.close();
    this.#socket = undefined;
  }

  setCapabilities(capabilities: number) {
    this.#capabilities = capabilities;
  }

  async send(packet: SendPacket) {
    await packet.start();
    const data = packet.data;
    const size = packet.size;
    const header = new TypedWriter(4);
    header.writeUints(3, size);
    header.write(packet.no);

    try {
      for (const chunk of data) {
        await writeAll(this.#socket!, chunk);
      }
    } catch (error) {
      throw new WriteError(error.message);
    }
  }

  async #receive(): Promise<ReceivePacket | null> {
    const headerBuffer = new Uint8Array(4);

    if (!(await readFull(this.#socket!, headerBuffer))) {
      return null;
    }

    const header = new TypedReader(headerBuffer);
    const size = header.readUints(3);
    const no = header.readUint8();
    const body = new Uint8Array(size);

    if (!(await readFull(this.#socket!, body))) {
      return null;
    }

    let type: ReceivePacketType;

    switch (body[0]) {
      case 0x00:
        type = 'OK';
        break;
      case 0xff:
        type = 'ERROR';
        break;
      case 0xfe:
        type = 'EOF';
        break;
      default:
        type = 'RESULT';
        break;
    }

    const packet: ReceivePacket = {
      type,
      header: { size, no },
      body: new Uint8Array(size),
    };

    return packet;
  }

  async receive(): Promise<ReceivePacket> {
    if (!this.#socket) {
      throw new ConnnectionError('Not connected');
    }

    const packet = await Promise.race([
      this.#receive(),
      delay(this.#timeout).then(() => {
        throw new ResponseTimeoutError('Connection read timed out');
      }),
    ]);

    if (!packet) {
      this.#close();
      throw new ReadError('Connection closed unexpectedly');
    }

    if (packet.type === 'ERROR') {
      throw new ErrorBody(packet.body, this.#capabilities);
    }

    return packet!;
  }
}
