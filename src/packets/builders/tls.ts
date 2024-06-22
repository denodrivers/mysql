import { BufferWriter } from "../../buffer.ts";
import { Charset } from "../../constant/charset.ts";
import type { HandshakeBody } from "../parsers/handshake.ts";
import { clientCapabilities } from "./client_capabilities.ts";

export function buildSSLRequest(
  packet: HandshakeBody,
  params: { db?: string },
): Uint8Array {
  const clientParam: number = clientCapabilities(packet, {
    db: params.db,
    ssl: true,
  });
  const writer = new BufferWriter(new Uint8Array(32));
  writer
    .writeUint32(clientParam)
    .writeUint32(2 ** 24 - 1)
    .write(Charset.UTF8_GENERAL_CI)
    .skip(23);
  return writer.wroteData;
}
