import { Conn, dial } from "deno";
import { encode } from "./../modules.ts";
import { BufferWriter } from "./buffer.ts";
import { Client } from "./client.ts";
import { log } from "./logger.ts";
import { buildAuth } from "./packets/builders/auth.ts";
import { ReceivePacket, SendPacket } from "./packets/packet.ts";
import { parseError } from "./packets/parsers/err.ts";
import { parseHandshake } from "./packets/parsers/handshake.ts";
import { FieldInfo, parseField, parseRow } from "./packets/parsers/result.ts";

enum ConnectionState {
    CONNECTING, CONNECTED, COLSING, CLOSED
};

export class Connection {
    state: ConnectionState = ConnectionState.CONNECTING;
    capabilities: number = 0;

    private conn: Conn;

    constructor(readonly client: Client) { }

    async connect() {
        const { hostname, port } = this.client.config;
        this.conn = await dial("tcp", `${hostname}:${port}`);
        log.info(`connecting ${hostname}`);

        let receive = await this.nextPacket();
        const handshakePacket = parseHandshake(receive.body);
        const data = buildAuth(handshakePacket, {
            username: this.client.config.username,
            password: this.client.config.password,
            db: this.client.config.db,
        });
        await new SendPacket(data, 0x1).send(this.conn);
        this.state = ConnectionState.CONNECTING;
        this.capabilities = handshakePacket.serverCapabilities;

        receive = await this.nextPacket();
        const header = receive.body.readUint8();
        if (header === 0xff) {
            const error = parseError(receive.body, this);
            log.error(`connect error(${error.code}): ${error.message}`);
            this.close();
        } else {
            log.info(`connected to ${this.client.config.hostname}`);
            this.state = ConnectionState.CONNECTED;
        }
    }

    private async nextPacket(): Promise<ReceivePacket> {
        while (true) {
            const packet = await new ReceivePacket().parse(this.conn);
            if (packet) return packet;
        }
    }

    close(): void {
        this.state = ConnectionState.COLSING;
        this.conn.close();
        this.state = ConnectionState.CLOSED;
    }

    async query(sql: string): Promise<any[]> {
        const data = encode(sql);
        const writer = new BufferWriter(new Uint8Array(data.length + 1));
        writer.write(3);
        writer.writeBuffer(data);
        await new SendPacket(writer.buffer, 0).send(this.conn);
        let receive = await this.nextPacket();
        let fieldCount = receive.body.readEncodedLen();
        if (fieldCount === 0xff) {
            const error = parseError(receive.body, this);
            log.error(`connect error(${error.code}): ${error.message}`);
            throw new Error(error.message);
        }
        const fields: FieldInfo[] = [];
        while (fieldCount--) {
            const packet = await this.nextPacket();
            const field = parseField(packet.body);
            fields.push(field);
        }
        await this.nextPacket(); // EOF
        const rows = [];
        while (true) {
            receive = await this.nextPacket();
            if (receive.type === "EOF") {
                break;
            } else {
                const row = parseRow(receive.body, fields);
                rows.push(row);
            }
        }
        return rows;
    }
}