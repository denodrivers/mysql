import { TypedReader } from '../typedBuffer.ts';
import { readFull } from '../../util.ts';

export interface PacketHeader {
  size: number;
  no: number;
}

export interface BasePacket {
  header: PacketHeader;
  body: Uint8Array;
}

export type ReceivePacketType = 'OK' | 'ERROR' | 'RESULT' | 'EOF';

export interface ReceivePacket extends BasePacket {
  type: ReceivePacketType;
}

export async function receivePacket(
  reader: Deno.Reader
): Promise<ReceivePacket | null> {
  const header = new TypedReader(new Uint8Array(4));
  const size = header.readUints(3);
  const no = header.readUint8();

  const body = new Uint8Array(size);
  readFull(reader, body);

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

  // debug(() => {
  //   const data = new Uint8Array(readCount);
  //   data.set(header.buffer);
  //   data.set(this.body.buffer, 4);
  //   log.debug(
  //     `receive: ${readCount}B, size = ${this.header.size}, no = ${
  //       this.header.no
  //     } \n${byteFormat(data)}\n`
  //   );
  // });

  return packet;
}

export abstract class SendPacket {
  data: Uint8Array[] = [];

  constructor(readonly no: number) {}

  abstract start(): Promise<void>;

  get size(): number {
    let size = 0;
    for (const chunk of this.data) {
      size += chunk.byteLength;
    }
    return size;
  }
}
