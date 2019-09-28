import { Client } from "./client.ts";
import { log } from "./logger.ts";
import { buildAuth } from "./packets/builders/auth.ts";
import { buildQuery } from "./packets/builders/query.ts";
import { ReceivePacket, SendPacket } from "./packets/packet.ts";
import { parseError } from "./packets/parsers/err.ts";
import { parseHandshake } from "./packets/parsers/handshake.ts";
import { FieldInfo, parseField, parseRow } from "./packets/parsers/result.ts";

/**
 * Connection state
 */
export enum ConnectionState {
  CONNECTING,
  CONNECTED,
  COLSING,
  CLOSED
}

/**
 * Result for excute sql
 */
export type ExecuteResult = {
  affectedRows?: number;
  lastInsertId?: number;
  fields?: FieldInfo[];
  rows?: any[];
};

/** Connection for mysql */
export class Connection {
  state: ConnectionState = ConnectionState.CONNECTING;
  capabilities: number = 0;
  serverVersion: string;

  private conn: Deno.Conn;

  constructor(readonly client: Client) {}

  private async _connect() {
    const { hostname, port } = this.client.config;
    log.info(`connecting ${hostname}:${port}`);
    this.conn = await Deno.dial({
      hostname,
      port,
      transport: "tcp"
    });

    let receive = await this.nextPacket();
    const handshakePacket = parseHandshake(receive.body);
    const data = buildAuth(handshakePacket, {
      username: this.client.config.username,
      password: this.client.config.password,
      db: this.client.config.db
    });
    await new SendPacket(data, 0x1).send(this.conn);
    this.state = ConnectionState.CONNECTING;
    this.serverVersion = handshakePacket.serverVersion;
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

  /** Connect to database */
  async connect(): Promise<void> {
    let { retry = 3, timeout = 10000 } = this.client.config;
    let timer = 0;
    while (retry--) {
      try {
        await Promise.race([
          this._connect().then(() => clearTimeout(timer)),
          new Promise(
            (_, reject) =>
              (timer = setTimeout(() => {
                this.conn && this.conn.close();
                reject(new Error("connect timeout"));
              }, timeout))
          )
        ]);
        if (this.state == ConnectionState.CONNECTED) {
          break;
        }
        break;
      } catch (err) {
        log.error(err.message);
        log.info(`retrying ${retry}`);
      }
    }
    if (this.state !== ConnectionState.CONNECTED) {
      throw new Error("connect fail");
    }
  }

  private async nextPacket(): Promise<ReceivePacket> {
    while (this.conn) {
      const packet = await new ReceivePacket().parse(this.conn);
      if (packet) {
        if (packet.type === "ERR") {
          packet.body.skip(1);
          const error = parseError(packet.body, this);
          throw new Error(error.message);
        }
        return packet;
      }
    }
  }

  /** Close database connection */
  close(): void {
    log.info("close connection");
    this.state = ConnectionState.COLSING;
    this.conn && this.conn.close();
    this.state = ConnectionState.CLOSED;
  }

  /**
   * excute query sql
   * @param sql query sql string
   * @param params query params
   */
  async query(sql: string, params?: any[]): Promise<ExecuteResult | any[]> {
    const result = await this.execute(sql, params);
    if (result && result.rows) {
      return result.rows;
    } else {
      return result;
    }
  }

  /**
   * excute sql
   * @param sql sql string
   * @param params query params
   */
  async execute(sql: string, params?: any[]): Promise<ExecuteResult> {
    const data = buildQuery(sql, params);
    await new SendPacket(data, 0).send(this.conn);
    let receive = await this.nextPacket();
    if (receive.type === "OK") {
      receive.body.skip(1);
      return {
        affectedRows: receive.body.readEncodedLen(),
        lastInsertId: receive.body.readEncodedLen()
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
    if (this.serverVersion < "5.7.0") {
      // EOF(less than 5.7)
      receive = await this.nextPacket();
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
