import { BufferWriter } from "../../buffer.ts";
import {
    CLIENT_CONNECT_WITH_DB,
    CLIENT_PLUGIN_AUTH,
    CLIENT_LONG_PASSWORD,
    CLIENT_PROTOCOL_41,
    CLIENT_TRANSACTIONS,
    CLIENT_MULTI_RESULTS,
    CLIENT_SECURE_CONNECTION,
    CLIENT_LONG_FLAG,
    CLIENT_PLUGIN_AUTH_LENENC_CLIENT_DATA,
    CLIENT_DEPRECATE_EOF
} from "../../consttants/capabilities.ts";
import { UTF8_GENERAL_CI } from "../../consttants/charset.ts";
import { auth } from "../../auth/mysql_native_password.ts";
import { HandshakeBody } from "../parsers/handshake.ts";

export function buildAuth(
    packet: HandshakeBody,
    params: { username: string; password: string; db: string }
): Uint8Array {
    let clientParam: number =
        CLIENT_CONNECT_WITH_DB |
        CLIENT_PLUGIN_AUTH |
        CLIENT_LONG_PASSWORD |
        CLIENT_PROTOCOL_41 |
        CLIENT_TRANSACTIONS |
        CLIENT_MULTI_RESULTS |
        CLIENT_SECURE_CONNECTION;

    if (packet.serverCapabilities & CLIENT_LONG_FLAG) {
        clientParam |= CLIENT_LONG_FLAG;
    }
    if (packet.serverCapabilities & CLIENT_PLUGIN_AUTH_LENENC_CLIENT_DATA) {
        clientParam |= CLIENT_PLUGIN_AUTH_LENENC_CLIENT_DATA;
    }
    if (packet.serverCapabilities & CLIENT_DEPRECATE_EOF) {
        clientParam |= CLIENT_DEPRECATE_EOF;
    }
    if (packet.serverCapabilities & CLIENT_PLUGIN_AUTH) {
        const writer = new BufferWriter(new Uint8Array(1000));
        writer
            .writeUint32(clientParam)
            .writeUint32(265 * 256 * 256 - 1)
            .write(UTF8_GENERAL_CI)
            .skip(23)
            .writeNullTerminatedString(params.username);

        const authData = auth(params.password, packet.seed);

        if (
            clientParam & CLIENT_PLUGIN_AUTH_LENENC_CLIENT_DATA ||
            clientParam & CLIENT_SECURE_CONNECTION
        ) {
            // request lenenc-int length of auth-response and string[n] auth-response
            writer.write(authData.length);
            writer.writeBuffer(authData);
        } else {
            writer.writeBuffer(authData);
            writer.write(0);
        }
        if (clientParam & CLIENT_CONNECT_WITH_DB) {
            writer.writeNullTerminatedString(params.db);
        }

        if (clientParam & CLIENT_PLUGIN_AUTH) {
            writer.writeNullTerminatedString(packet.authPluginName);
        }

        return writer.wroteData;
    }
    return null;
}
