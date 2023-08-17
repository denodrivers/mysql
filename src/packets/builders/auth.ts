import auth from "../../auth.ts";
import { BufferWriter } from "../../buffer.ts";
import ServerCapabilities from "../../constant/capabilities.ts";
import { Charset } from "../../constant/charset.ts";
import type { HandshakeBody } from "../parsers/handshake.ts";
import { clientCapabilities } from "./client_capabilities.ts";

/** @ignore */
export function buildAuth(
  packet: HandshakeBody,
  params: { username: string; password?: string; db?: string; ssl?: boolean },
): Uint8Array {
  const clientParam: number = clientCapabilities(packet, params);

  if (packet.serverCapabilities & ServerCapabilities.CLIENT_PLUGIN_AUTH) {
    const writer = new BufferWriter(new Uint8Array(1000));
    writer
      .writeUint32(clientParam)
      .writeUint32(2 ** 24 - 1)
      .write(Charset.UTF8_GENERAL_CI)
      .skip(23)
      .writeNullTerminatedString(params.username);
    if (params.password) {
      const authData = auth(
        packet.authPluginName,
        params.password,
        packet.seed,
      );
      if (
        clientParam &
          ServerCapabilities.CLIENT_PLUGIN_AUTH_LENENC_CLIENT_DATA ||
        clientParam & ServerCapabilities.CLIENT_SECURE_CONNECTION
      ) {
        // request lenenc-int length of auth-response and string[n] auth-response
        writer.write(authData.length);
        writer.writeBuffer(authData);
      } else {
        writer.writeBuffer(authData);
        writer.write(0);
      }
    } else {
      writer.write(0);
    }
    if (clientParam & ServerCapabilities.CLIENT_CONNECT_WITH_DB && params.db) {
      writer.writeNullTerminatedString(params.db);
    }
    if (clientParam & ServerCapabilities.CLIENT_PLUGIN_AUTH) {
      writer.writeNullTerminatedString(packet.authPluginName);
    }
    return writer.wroteData;
  }
  return Uint8Array.from([]);
}
