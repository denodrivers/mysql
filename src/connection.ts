import { ClientConfig } from './client.ts';
import {
  ConnnectionError,
  ProtocolError,
  ReadError,
  ResponseTimeoutError,
} from './constant/errors.ts';
import { log } from './logger.ts';
import { buildAuth } from './packets/builders/auth.ts';
import { buildQuery } from './packets/builders/query.ts';
import { ReceivePacket, SendPacket } from './packets/packet.ts';
import { parseError } from './packets/parsers/err.ts';
import {
  AuthResult,
  parseAuth,
  parseHandshake,
} from './packets/parsers/handshake.ts';
import {
  FieldInfo,
  parseBinaryRow,
  parseField,
  parseRow,
} from './packets/parsers/result.ts';
import { PacketType } from './constant/packet.ts';
import authPlugin from './auth_plugin/index.ts';
import {
  buildStmtExecutePacket,
  buildStmtPreparedPacket,
} from './packets/builders/stmt.ts';
import { replaceIdentifier } from './util.ts';
import {
  MYSQL_TYPE_INT24,
  MYSQL_TYPE_LONG,
  MYSQL_TYPE_VARCHAR,
  MYSQL_TYPE_VAR_STRING,
} from './constant/mysql_types.ts';

/**
 * Connection state
 */
export enum ConnectionState {
  CONNECTING,
  CONNECTED,
  CLOSING,
  CLOSED,
}

/**
 * Result for execute sql
 */
export type ExecuteResult = {
  affectedRows?: number;
  lastInsertId?: number;
  fields?: FieldInfo[];
  rows?: any[];
  iterator?: any;
};

export interface PreparedStatement {
  statementId: number;
  numColumns: number;
  numParams: number;
  warningCount: number;
  params: FieldInfo[];
  columns: FieldInfo[];
}

/** Connection for mysql */
export class Connection {
  state: ConnectionState = ConnectionState.CONNECTING;
  capabilities: number = 0;
  serverVersion: string = '';

  private conn?: Deno.Conn = undefined;
  private _timedOut = false;

  #cachedStatements = new Map<string, PreparedStatement>();

  get remoteAddr(): string {
    return this.config.socketPath
      ? `unix:${this.config.socketPath}`
      : `${this.config.hostname}:${this.config.port}`;
  }

  constructor(readonly config: ClientConfig) {}

  private async _connect() {
    // TODO: implement connect timeout
    const {
      hostname,
      port = 3306,
      socketPath,
      username = '',
      password,
    } = this.config;
    log.info(`connecting ${this.remoteAddr}`);

    this.conn = !socketPath
      ? await Deno.connect({
          transport: 'tcp',
          hostname,
          port,
        })
      : await Deno.connect({
          transport: 'unix',
          path: socketPath,
        } as any);

    try {
      let receive = await this.nextPacket();
      const handshakePacket = parseHandshake(receive.body);
      const data = buildAuth(handshakePacket, {
        username,
        password,
        db: this.config.db,
      });

      await new SendPacket(data, 0x1).send(this.conn);

      this.state = ConnectionState.CONNECTING;
      this.serverVersion = handshakePacket.serverVersion;
      this.capabilities = handshakePacket.serverCapabilities;

      receive = await this.nextPacket();

      const authResult = parseAuth(receive);
      let handler;

      switch (authResult) {
        case AuthResult.AuthMoreRequired:
          const adaptedPlugin = (authPlugin as any)[
            handshakePacket.authPluginName
          ];
          handler = adaptedPlugin;
          break;
        case AuthResult.MethodMismatch:
          // TODO: Negotiate
          throw new Error('Currently cannot support auth method mismatch!');
      }

      let result;
      if (handler) {
        result = handler.start(handshakePacket.seed, password!);
        while (!result.done) {
          if (result.data) {
            const sequenceNumber = receive.header.no + 1;
            await new SendPacket(result.data, sequenceNumber).send(this.conn);
            receive = await this.nextPacket();
          }
          if (result.quickRead) {
            await this.nextPacket();
          }
          if (result.next) {
            result = result.next(receive);
          }
        }
      }

      const header = receive.body.readUint8();
      if (header === 0xff) {
        const error = parseError(receive.body, this);
        log.error(`connect error(${error.code}): ${error.message}`);
        this.close();
        throw new Error(error.message);
      } else {
        log.info(`connected to ${this.remoteAddr}`);
        this.state = ConnectionState.CONNECTED;
      }

      if (this.config.charset) {
        // await this.execute(`SET NAMES ${this.config.charset}`);
      }
    } catch (error) {
      // Call close() to avoid leaking socket.
      this.close();
      throw error;
    }
  }

  /** Connect to database */
  async connect(): Promise<void> {
    await this._connect();
  }

  private async nextPacket(): Promise<ReceivePacket> {
    if (!this.conn) {
      throw new ConnnectionError('Not connected');
    }

    const timeoutTimer = this.config.timeout
      ? setTimeout(this._timeoutCallback, this.config.timeout)
      : null;
    let packet: ReceivePacket | null;
    try {
      packet = await new ReceivePacket().parse(this.conn!);
    } catch (error) {
      if (this._timedOut) {
        // Connection has been closed by timeoutCallback.
        throw new ResponseTimeoutError('Connection read timed out');
      }
      timeoutTimer && clearTimeout(timeoutTimer);
      this.close();
      throw error;
    }
    timeoutTimer && clearTimeout(timeoutTimer);

    if (!packet) {
      // Connection is half-closed by the remote host.
      // Call close() to avoid leaking socket.
      this.close();
      throw new ReadError('Connection closed unexpectedly');
    }
    if (packet.type === PacketType.ERR_Packet) {
      packet.body.skip(1);
      const error = parseError(packet.body, this);
      throw new Error(error.message);
    }
    return packet!;
  }

  private _timeoutCallback = () => {
    log.info('connection read timed out');
    this._timedOut = true;
    this.close();
  };

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
  private lessThan5_7(): Boolean {
    const version = this.serverVersion;
    if (!version.includes('MariaDB')) return version < '5.7.0';
    const segments = version.split('-');
    // MariaDB v5.x
    if (segments[1] === 'MariaDB') return segments[0] < '5.7.0';
    // MariaDB v10+
    return false;
  }

  /** Check if the MariaDB version is 10.0 or 10.1 */
  private isMariaDBAndVersion10_0Or10_1(): Boolean {
    const version = this.serverVersion;
    if (!version.includes('MariaDB')) return false;
    return version.includes('5.5.5-10.1') || version.includes('5.5.5-10.0');
  }

  /** Close database connection */
  close(): void {
    if (this.state != ConnectionState.CLOSED) {
      log.info('close connection');
      this.conn?.close();
      this.state = ConnectionState.CLOSED;
    }
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

  async #stmtPrepare(sql: string): Promise<PreparedStatement> {
    const data = buildStmtPreparedPacket(sql);
    await new SendPacket(data, 0).send(this.conn!);
    let receive = await this.nextPacket();
    if (receive.type === PacketType.OK_Packet) {
      receive.body.skip(1);
      const statement: PreparedStatement = {
        statementId: receive.body.readUint32(),
        numColumns: receive.body.readUint16(),
        numParams: receive.body.readUint16(),
        warningCount: receive.body.skip(1).readUint16(),
        params: [],
        columns: [],
      };
      if (statement.numParams) {
        let count = statement.numParams;
        const fields = statement.params;
        while (count--) {
          const packet = await this.nextPacket();
          if (packet) {
            const field = parseField(packet.body);
            fields.push(field);
          }
        }
      }
      if (statement.numColumns) {
        let count = statement.numColumns;
        const fields = statement.columns;
        while (count--) {
          const packet = await this.nextPacket();
          if (packet) {
            const field = parseField(packet.body);
            fields.push(field);
          }
        }
      }
      return statement;
    } else {
      throw new ProtocolError();
    }
  }

  async #stmtExecute(
    stagement: PreparedStatement,
    params?: any[],
    iterator = false
  ): Promise<ExecuteResult> {
    if (this.state != ConnectionState.CONNECTED) {
      if (this.state == ConnectionState.CLOSED) {
        throw new ConnnectionError('Connection is closed');
      } else {
        throw new ConnnectionError('Must be connected first');
      }
    }

    const data = buildStmtExecutePacket(stagement, params);

    try {
      await new SendPacket(data, 0).send(this.conn!);
      let receive = await this.nextPacket();

      if (receive.type === PacketType.OK_Packet) {
        receive.body.skip(1);
        return {
          affectedRows: receive.body.readEncodedLen(),
          lastInsertId: receive.body.readEncodedLen(),
        };
      } else if (receive.type === PacketType.Result) {
        return await this.#parseBinaryResult(receive, true, iterator);
      } else {
        throw new ProtocolError();
      }
    } catch (error) {
      this.close();
      throw error;
    }
  }

  /**
   * execute sql
   * @param sql sql string
   * @param params query params
   * @param iterator whether to return an ExecuteIteratorResult or ExecuteResult
   */
  async execute(
    sql: string,
    params?: any[],
    iterator = false
  ): Promise<ExecuteResult> {
    const parsedSql = replaceIdentifier(sql, params);
    console.log(parsedSql);
    // let statement = this.#cachedStatements.get(parsedSql.sql);
    // if (!statement) {
    const statement = await this.#stmtPrepare(parsedSql.sql);
    if (sql.startsWith('INSERT')) {
      // statement.params[0].fieldType = MYSQL_TYPE_LONG;
      // statement.params[1].fieldType = MYSQL_TYPE_VAR_STRING;
    }
    this.#cachedStatements.set(parsedSql.sql, statement);
    // }
    console.log(statement);
    return this.#stmtExecute(statement, parsedSql.params, iterator);
  }

  async #parseResult(
    receive: ReceivePacket,
    binaryResult: boolean,
    iterator?: boolean
  ) {
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
    if (this.lessThan5_7() || this.isMariaDBAndVersion10_0Or10_1()) {
      // EOF(less than 5.7 or mariadb version is 10.0 or 10.1)
      receive = await this.nextPacket();
      if (receive.type !== PacketType.EOF_Packet) {
        throw new ProtocolError();
      }
    }

    if (!iterator) {
      while (true) {
        receive = await this.nextPacket();
        if (receive.type === PacketType.EOF_Packet) {
          break;
        } else {
          const row = binaryResult
            ? parseBinaryRow(receive.body, fields)
            : parseRow(receive.body, fields);

          rows.push(row);
        }
      }
      return { rows, fields };
    }

    return {
      fields,
      iterator: this.buildIterator(fields),
    };
  }

  async #parseBinaryResult(
    receive: ReceivePacket,
    binaryResult: boolean,
    iterator?: boolean
  ) {
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
    if (this.lessThan5_7() || this.isMariaDBAndVersion10_0Or10_1()) {
      // EOF(less than 5.7 or mariadb version is 10.0 or 10.1)
      receive = await this.nextPacket();
      if (receive.type !== PacketType.EOF_Packet) {
        throw new ProtocolError();
      }
    }

    if (!iterator) {
      while (true) {
        receive = await this.nextPacket();
        if (receive.type === PacketType.EOF_Packet) {
          break;
        } else {
          const row = binaryResult
            ? parseBinaryRow(receive.body, fields)
            : parseRow(receive.body, fields);

          rows.push(row);
        }
      }
      return { rows, fields };
    }

    return {
      fields,
      iterator: this.buildIterator(fields),
    };
  }

  private buildIterator(fields: FieldInfo[]): any {
    const next = async () => {
      const receive = await this.nextPacket();

      if (receive.type === PacketType.EOF_Packet) {
        return { done: true };
      }

      const value = parseRow(receive.body, fields);

      return {
        done: false,
        value,
      };
    };

    return {
      [Symbol.asyncIterator]: () => {
        return {
          next,
        };
      },
    };
  }
}
