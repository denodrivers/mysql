import { Client } from "./client.ts";
import { log } from "./logger.ts";
import { buildAuth } from "./packets/builders/auth.ts";
import { buildQuery } from "./packets/builders/query.ts";
import { ReceivePacket, SendPacket } from "./packets/packet.ts";
import { parseError } from "./packets/parsers/err.ts";
import { parseHandshake } from "./packets/parsers/handshake.ts";
import { FieldInfo, parseField, parseRow } from "./packets/parsers/result.ts";

enum ConnectionState {
    CONNECTING, CONNECTED, COLSING, CLOSED
};

export type ExecuteResult = {
    affectedRows?: number;
    lastInsertId?: number;
    fields?: FieldInfo[];
    rows?: any[];
};

export class Connection {
    state: ConnectionState = ConnectionState.CONNECTING;
    capabilities: number = 0;

    private conn: Deno.Conn;

    constructor(readonly client: Client) { }

    async connect() {
        const { hostname, port } = this.client.config;
        this.conn = await Deno.dial("tcp", `${hostname}:${port}`);
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
            throw new Error(error.message);
        } else {
            log.info(`connected to ${this.client.config.hostname}`);
            this.state = ConnectionState.CONNECTED;
        }
    }

    private async nextPacket(): Promise<ReceivePacket> {
        while (true) {
            const packet = await new ReceivePacket().parse(this.conn);
            if (packet) {
                if (packet.type === "ERR") {
                    packet.body.skip(1);
                    const error = parseError(packet.body, this);
                    throw new Error(error.message);
                }
                return packet
            };
        }
    }

    close(): void {
        this.state = ConnectionState.COLSING;
        this.conn.close();
        this.state = ConnectionState.CLOSED;
    }

    async query(sql: string, params?: any[]): Promise<ExecuteResult | any[]> {
        const result = await this.execute(sql, params);
        if (result && result.rows) {
            return result.rows;
        } else {
            return result;
        }
    }

    async execute(sql: string, params?: any[]): Promise<ExecuteResult> {
        const data = buildQuery(sql, params);
        await new SendPacket(data, 0).send(this.conn);
        let receive = await this.nextPacket();
        if (receive.type === "OK") {
            receive.body.skip(1);
            return {
                affectedRows: receive.body.readEncodedLen(),
                lastInsertId: receive.body.readEncodedLen(),
            };
        }
        let fieldCount = receive.body.readEncodedLen();
        const fields: FieldInfo[] = [];
        while (fieldCount--) {
            const packet = await this.nextPacket();
            const field = parseField(packet.body);
            fields.push(field);
        }

        const rows = [];
        receive = await this.nextPacket(); // EOF(less than 5.7)
        if (receive.type == "RESULT") {
            const row = parseRow(receive.body, fields);
            rows.push(row);
        }
        while (true) {
            receive = await this.nextPacket();
            if (receive.type === "EOF") {
                break;
            } else {
                const row = parseRow(receive.body, fields);
                rows.push(row);
            }
        }
        return { rows, fields };
    }
}