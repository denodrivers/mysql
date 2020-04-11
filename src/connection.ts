import { delay } from "../deps.ts";
import { Client } from "./client.ts";
import { ResponseTimeoutError } from "./constant/errors.ts";
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
  CLOSED,
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
  serverVersion: string = "";

  private conn?: Deno.Conn;

  constructor(readonly client: Client) {}

  private async _connect() {
    const { hostname, port = 3306 } = this.client.config;
    log.info(`connecting ${hostname}:${port}`);
    this.conn = await Deno.connect({
      hostname,
      port,
      transport: "tcp",
    });

    let receive = await this.nextPacket();
    const handshakePacket = parseHandshake(receive.body);
    const data = buildAuth(handshakePacket, {
      username: this.client.config.username ?? "",
      password: this.client.config.password,
      db: this.client.config.db,
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

    if (this.client.config.charset) {
      await this.execute(`SET NAMES ${this.client.config.charset}`);
    }
  }

  /** Connect to database */
  async connect(): Promise<void> {
    await this._connect();
  }

  private async nextPacket(): Promise<ReceivePacket> {
    let eofCount = 0;
    const timeout = this.client.config.timeout || 1000;

    while (this.conn!) {
      const packet = await new ReceivePacket().parse(this.conn!);
      if (packet) {
        if (packet.type === "ERR") {
          packet.body.skip(1);
          const error = parseError(packet.body, this);
          throw new Error(error.message);
        }
        return packet!;
      } else {
        await delay(100);
        if (eofCount++ * 100 >= timeout) {
          throw new ResponseTimeoutError("Read packet timeout");
        }
      }
    }
    throw new Error("Not connected");
  }

  /**
   * Check if database server version is less than 5.7.0
   *
   * MySQL version is "x.y.z"
   *   eg "5.5.62"
   *
   * MariaDB version is "5.5.5-x.y.z-MariaDB[-build-infos]" for versions after 5 (10.0 etc)
   *   eg "5.5.5-10.4.10-MariaDB-1:10.4.10+maria~bionic"
   * and "x.y.z-MariaDB-[build-infos]" for 5.x versions
   *   eg "5.5.64-MariaDB-1~trusty"
   */
  private lessThan57(): Boolean {
    const version = this.serverVersion;
    if (!version.includes("MariaDB")) return version < "5.7.0";
    const segments = version.split("-");
    // MariaDB v5.x
    if (segments[1] === "MariaDB") return segments[0] < "5.7.0";
    // MariaDB v10+
    return false;
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
    if (!this.conn) {
      throw new Error("Must be connected first");
    }
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
      if (packet) {
        const field = parseField(packet.body);
        fields.push(field);
      }
    }

    const rows = [];
    if (this.lessThan57()) {
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
