import { byteFormat } from "../util.ts";
import { BufferReader, BufferWriter } from "../buffer.ts";
import { WriteError } from "../constant/errors.ts";
import { logger } from "../logger.ts";
import { PacketType } from "../constant/packet.ts";

/** @ignore */
interface PacketHeader {
  size: number;
  no: number;
}

/**
 * Helper for sending a packet through the connection
 */
export class PacketWriter {
  header: PacketHeader;
  body: Uint8Array;

  constructor(body: Uint8Array, no: number) {
    this.body = body;
    this.header = { size: body.length, no };
  }

  /**
   * Send the packet through the connection
   *
   * @param conn The connection
   */
  async write(conn: Deno.Conn) {
    const body = this.body;

    const data = new BufferWriter(new Uint8Array(4 + body.length));
    data.writeUints(3, this.header.size);
    data.write(this.header.no);
    data.writeBuffer(body);
    logger().debug(`send: ${data.length}B \n${byteFormat(data.buffer)}\n`);
    try {
      let wrote = 0;
      do {
        wrote += await conn.write(data.buffer.subarray(wrote));
      } while (wrote < data.length);
    } catch (error) {
      throw new WriteError(error.message);
    }
  }

  /**
   * Send a packet through the connection
   *
   * @param conn The connection
   * @param body The packet body
   * @param no The packet number
   * @returns SendPacket instance
   */
  static async write(
    conn: Deno.Conn,
    body: Uint8Array,
    no: number,
  ): Promise<PacketWriter> {
    const packet = new PacketWriter(body, no);
    await packet.write(conn);
    return packet;
  }
}

/**
 * Helper for receiving a packet through the connection
 */
export class PacketReader {
  header: PacketHeader;
  body: BufferReader;
  type: PacketType;

  constructor(header: PacketHeader, body: BufferReader, type: PacketType) {
    this.header = header;
    this.body = body;
    this.type = type;
  }

  /**
   * Read a subarray from the connection
   *
   * @param conn The connection
   * @param buffer The buffer to read into
   * @returns The number of bytes read
   */
  static async _readSubarray(
    conn: Deno.Conn,
    buffer: Uint8Array,
  ): Promise<number | null> {
    const size = buffer.length;
    let haveRead = 0;
    while (haveRead < size) {
      const nread = await conn.read(buffer.subarray(haveRead));
      if (nread === null) return null;
      haveRead += nread;
    }
    return haveRead;
  }

  /**
   * Read a subarray from the connection
   *
   * @param conn
   * @returns The PacketReader instance or null if nothing could be read
   */
  static async read(conn: Deno.Conn): Promise<PacketReader | null> {
    const headerReader = new BufferReader(new Uint8Array(4));
    let readCount = 0;
    let nread = await this._readSubarray(conn, headerReader.buffer);
    if (nread === null) return null;
    readCount = nread;
    const bodySize = headerReader.readUints(3);
    const header = {
      size: bodySize,
      no: headerReader.readUint8(),
    };
    const bodyReader = new BufferReader(new Uint8Array(bodySize));
    nread = await this._readSubarray(conn, bodyReader.buffer);
    if (nread === null) return null;
    readCount += nread;

    let type: PacketType;
    switch (bodyReader.buffer[0]) {
      case PacketType.OK_Packet:
        type = PacketType.OK_Packet;
        break;
      case PacketType.ERR_Packet:
        type = PacketType.ERR_Packet;
        break;
      case PacketType.EOF_Packet:
        type = PacketType.EOF_Packet;
        break;
      default:
        type = PacketType.Result;
        break;
    }

    logger().debug(() => {
      const data = new Uint8Array(readCount);
      data.set(headerReader.buffer);
      data.set(bodyReader.buffer, 4);
      return `receive: ${readCount}B, size = ${header.size}, no = ${header.no} \n${
        byteFormat(data)
      }\n`;
    });

    return new PacketReader(header, bodyReader, type);
  }
}
