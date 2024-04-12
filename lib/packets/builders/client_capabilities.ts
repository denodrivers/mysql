import ServerCapabilities from "../../constant/capabilities.ts";
import type { HandshakeBody } from "../parsers/handshake.ts";

export function clientCapabilities(
  packet: HandshakeBody,
  params: { db?: string; ssl?: boolean },
): number {
  return (params.db ? ServerCapabilities.CLIENT_CONNECT_WITH_DB : 0) |
    ServerCapabilities.CLIENT_PLUGIN_AUTH |
    ServerCapabilities.CLIENT_LONG_PASSWORD |
    ServerCapabilities.CLIENT_PROTOCOL_41 |
    ServerCapabilities.CLIENT_TRANSACTIONS |
    ServerCapabilities.CLIENT_MULTI_RESULTS |
    ServerCapabilities.CLIENT_SECURE_CONNECTION |
    (ServerCapabilities.CLIENT_LONG_FLAG & packet.serverCapabilities) |
    (ServerCapabilities.CLIENT_PLUGIN_AUTH_LENENC_CLIENT_DATA &
      packet.serverCapabilities) |
    (ServerCapabilities.CLIENT_DEPRECATE_EOF & packet.serverCapabilities) |
    (params.ssl ? ServerCapabilities.CLIENT_SSL : 0);
}
