import { BufferWriter } from "../../buffer.ts";
import ServerCapabilities from "../../consttants/capabilities.ts";
import { auth } from "../../auth/mysql_native_password.ts";
import { HandshakeBody } from "../parsers/handshake.ts";
import { Charset } from "../../consttants/charset.ts";

/** @ignore */
export function buildAuth(
  packet: HandshakeBody,
  params: { username: string; password: string; db: string }
): Uint8Array {
  let clientParam: number =
    (params.db ? ServerCapabilities.CLIENT_CONNECT_WITH_DB : 0) |
    ServerCapabilities.CLIENT_PLUGIN_AUTH |
    ServerCapabilities.CLIENT_LONG_PASSWORD |
    ServerCapabilities.CLIENT_PROTOCOL_41 |
    ServerCapabilities.CLIENT_TRANSACTIONS |
    ServerCapabilities.CLIENT_MULTI_RESULTS |
    ServerCapabilities.CLIENT_SECURE_CONNECTION;

  if (packet.serverCapabilities & ServerCapabilities.CLIENT_LONG_FLAG) {
    clientParam |= ServerCapabilities.CLIENT_LONG_FLAG;
  }
  if (
    packet.serverCapabilities &
    ServerCapabilities.CLIENT_PLUGIN_AUTH_LENENC_CLIENT_DATA
  ) {
    clientParam |= ServerCapabilities.CLIENT_PLUGIN_AUTH_LENENC_CLIENT_DATA;
  }
  if (packet.serverCapabilities & ServerCapabilities.CLIENT_DEPRECATE_EOF) {
    clientParam |= ServerCapabilities.CLIENT_DEPRECATE_EOF;
  }
  if (packet.serverCapabilities & ServerCapabilities.CLIENT_PLUGIN_AUTH) {
    const writer = new BufferWriter(new Uint8Array(1000));
    writer
      .writeUint32(clientParam)
      .writeUint32(265 * 256 * 256 - 1)
      .write(Charset.UTF8_GENERAL_CI)
      .skip(23)
      .writeNullTerminatedString(params.username);
    if (params.password) {
      const authData = auth(params.password, packet.seed);
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
    if (clientParam & ServerCapabilities.CLIENT_CONNECT_WITH_DB) {
      writer.writeNullTerminatedString(params.db);
    }
    if (clientParam & ServerCapabilities.CLIENT_PLUGIN_AUTH) {
      writer.writeNullTerminatedString(packet.authPluginName);
    }
    return writer.wroteData;
  }
}
