import { byteFormat, writeAll } from '../../deps.ts';
import { BufferReader, BufferWriter } from '../buffer.ts';
import { WriteError } from '../constant/errors.ts';
import { debug, log } from '../logger.ts';
import { PacketType } from '../../src/constant/packet.ts';

/** @ignore */
interface PacketHeader {
  size: number;
  no: number;
}

/** @ignore */
export class SendPacket {
  header: PacketHeader;

  constructor(readonly body: Uint8Array | Uint8Array[], no: number) {
    if (body instanceof Uint8Array) {
      this.header = { size: body.length, no };
    } else {
      let size = 0;
      for (const chunk of body) {
        size += chunk.length;
      }
      this.header = { size, no };
    }
  }

  async send(conn: Deno.Conn) {
    const body = this.body;
    const data = new BufferWriter(new Uint8Array(4 + this.header.size));
    data.writeUints(3, this.header.size);
    data.write(this.header.no);

    if (body instanceof Uint8Array) {
      data.writeBuffer(body);
    } else {
      for (const chunk of body) {
        data.writeBuffer(chunk);
      }
    }

    try {
      await writeAll(conn, data.buffer);
      log.debug(`send: ${data.length}B \n${byteFormat(data.buffer)}\n`);
    } catch (error) {
      throw new WriteError(error.message);
    }
  }
}

/** @ignore */
export class ReceivePacket {
  header!: PacketHeader;
  body!: BufferReader;
  type!: PacketType;

  async parse(reader: Deno.Reader): Promise<ReceivePacket | null> {
    const header = new BufferReader(new Uint8Array(4));
    let readCount = 0;
    let nread = await this.read(reader, header.buffer);
    if (nread === null) return null;
    readCount = nread;
    const bodySize = header.readUints(3);
    this.header = {
      size: bodySize,
      no: header.readUint8(),
    };
    this.body = new BufferReader(new Uint8Array(bodySize));
    nread = await this.read(reader, this.body.buffer);
    if (nread === null) return null;
    readCount += nread;

    const { OK_Packet, ERR_Packet, EOF_Packet, Result } = PacketType;
    switch (this.body.buffer[0]) {
      case OK_Packet:
        this.type = OK_Packet;
        break;
      case ERR_Packet:
        this.type = ERR_Packet;
        break;
      case EOF_Packet:
        this.type = EOF_Packet;
        break;
      default:
        this.type = Result;
        break;
    }

    debug(() => {
      const data = new Uint8Array(readCount);
      data.set(header.buffer);
      data.set(this.body.buffer, 4);
      log.debug(
        `receive: ${readCount}B, size = ${this.header.size}, no = ${
          this.header.no
        } \n${byteFormat(data)}\n`
      );
    });

    return this;
  }

  private async read(
    reader: Deno.Reader,
    buffer: Uint8Array
  ): Promise<number | null> {
    const size = buffer.length;
    let haveRead = 0;
    while (haveRead < size) {
      const nread = await reader.read(buffer.subarray(haveRead));
      if (nread === null) return null;
      haveRead += nread;
    }
    return haveRead;
  }
}
