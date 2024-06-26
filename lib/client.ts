import type { SqlClient } from "@stdext/sql";
import { MysqlConnection, type MysqlConnectionOptions } from "./connection.ts";
import type { MysqlParameterType } from "./packets/parsers/result.ts";
import {
  MysqlClientEventTarget,
  MysqlCloseEvent,
  MysqlConnectEvent,
} from "./utils/events.ts";
import {
  type MysqlPreparedStatement,
  type MysqlQueryOptions,
  type MysqlTransaction,
  MysqlTransactionable,
  type MysqlTransactionOptions,
} from "./core.ts";

export interface MysqlClientOptions extends MysqlConnectionOptions {
}

/**
 * MySQL client
 */
export class MysqlClient extends MysqlTransactionable implements
  SqlClient<
    MysqlClientEventTarget,
    MysqlConnectionOptions,
    MysqlParameterType,
    MysqlQueryOptions,
    MysqlConnection,
    MysqlPreparedStatement,
    MysqlTransactionOptions,
    MysqlTransaction
  > {
  eventTarget: MysqlClientEventTarget;
  connectionUrl: string;
  connectionOptions: MysqlConnectionOptions;

  constructor(
    connectionUrl: string | URL,
    connectionOptions: MysqlClientOptions = {},
  ) {
    const conn = new MysqlConnection(connectionUrl, connectionOptions);
    super(conn);
    this.connectionUrl = connectionUrl.toString();
    this.connectionOptions = connectionOptions;
    this.eventTarget = new MysqlClientEventTarget();
  }
  async connect(): Promise<void> {
    await this.connection.connect();
    this.eventTarget.dispatchEvent(
      new MysqlConnectEvent({ connection: this.connection }),
    );
  }
  async close(): Promise<void> {
    this.eventTarget.dispatchEvent(
      new MysqlCloseEvent({ connection: this.connection }),
    );
    await this.connection.close();
  }

  async [Symbol.asyncDispose](): Promise<void> {
    await this.close();
  }
}
