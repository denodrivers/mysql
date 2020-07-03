import { byteFormat } from "../../deps.ts";
import { BufferReader, BufferWriter } from "../buffer.ts";
import { WriteError } from "../constant/errors.ts";
import { debug, log } from "../logger.ts";
import { PacketType } from '../../src/constant/packet.ts';

/** @ignore */
interface PacketHeader {
  size: number;
  no: number;
}

/** @ignore */
export class SendPacket {
  header: PacketHeader;

  constructor (readonly body: Uint8Array, no: number) {
    this.header = { size: body.length, no };
  }

  async send(conn: Deno.Conn) {
    const body = this.body as Uint8Array;
    const data = new BufferWriter(new Uint8Array(4 + body.length));
    data.writeUints(3, this.header.size);
    data.write(this.header.no);
    data.writeBuffer(body);
    log.debug(`send: ${data.length}B \n${byteFormat(data.buffer)}\n`);
    try {
      await conn.write(data.buffer);
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
    let nread = await reader.read(header.buffer);
    if (nread === null) return null;
    readCount = nread;
    this.header = {
      size: header.readUints(3),
      no: header.readUint8(),
    };

    console.log('pars received packet, body size: ', this.header.size);

    this.body = new BufferReader(new Uint8Array(this.header.size));
    nread = await reader.read(this.body.buffer);
    if (nread === null) return null;
    readCount += nread;

    log.warning(`body: ${byteFormat(this.body.buffer)}`);

    const { OK_Packet, ERR_Packet, EOF_Packet, Result } = PacketType
    switch (this.body.buffer[0]) {
      case OK_Packet:
        this.type = OK_Packet;
        break;
      case 0xff:
        this.type = ERR_Packet;
        break;
      case 0xfe:
        this.type = EOF_Packet;
        break;
      default:
        this.type = Result;
        break;
    }

    // if(this.body.buffer[0] === 0x01) {
    //   log.info('auth more data')
    //   const len = 16;
    //   let end = false;
    //   let count =  20;
    //   let extraBuffer;
    //     extraBuffer = new Uint8Array(len);
    //   while(!(end || count < 1)) {
    //     const result = await reader.read(extraBuffer)
    //     console.log('result',result, byteFormat(extraBuffer))
    //     if(Number(result) - len <0) {
    //       break;
    //     }
    //     count--;
    //   }
    //   log.info('auth more data end')
    // }

    debug(() => {
      const data = new Uint8Array(readCount);
      data.set(header.buffer);
      data.set(this.body.buffer, 4);
      log.debug(
        `receive: ${readCount}B, size = ${this.header.size}, no = ${this.header.no} \n${
        byteFormat(data)
        }\n`,
      );
    });

    return this;
  }
}
