import { SqlxClient } from "@halvardm/sqlx";
import { MysqlConnection, type MysqlConnectionOptions } from "./connection.ts";
import type { MysqlParameterType } from "./packets/parsers/result.ts";
import {
  MysqlClientCloseEvent,
  MysqlClientEventTarget,
} from "./utils/events.ts";
import { MysqlClientConnectEvent } from "../mod.ts";
import {
  type MysqlPrepared,
  type MysqlQueryOptions,
  type MySqlTransaction,
  MysqlTransactionable,
  type MysqlTransactionOptions,
} from "./sqlx.ts";

export interface MysqlClientOptions extends MysqlConnectionOptions {
}

/**
 * MySQL client
 */
export class MysqlClient extends MysqlTransactionable implements
  SqlxClient<
    MysqlClientEventTarget,
    MysqlConnectionOptions,
    MysqlConnection,
    MysqlParameterType,
    MysqlQueryOptions,
    MysqlPrepared,
    MysqlTransactionOptions,
    MySqlTransaction
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
      new MysqlClientConnectEvent({ connectable: this }),
    );
  }
  async close(): Promise<void> {
    this.eventTarget.dispatchEvent(
      new MysqlClientCloseEvent({ connectable: this }),
    );
    await this.connection.close();
  }

  async [Symbol.asyncDispose](): Promise<void> {
    await this.close();
  }
}
