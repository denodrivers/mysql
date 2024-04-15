import {
  type SqlxConnectionPool,
  type SqlxConnectionPoolOptions,
  SqlxError,
  type SqlxPoolConnection,
  type SqlxPoolConnectionEventType,
  VERSION,
} from "@halvardm/sqlx";
import {
  MysqlClient,
  type MysqlPrepared,
  type MysqlQueryOptions,
  type MySqlTransaction,
  type MysqlTransactionOptions,
} from "./client.ts";
import type { MysqlConnectionOptions } from "./connection.ts";
import type { MysqlParameterType } from "./packets/parsers/result.ts";
import { DeferredStack } from "./utils/deferred.ts";
import type { ArrayRow, Row } from "../../deno-sqlx/lib/interfaces.ts";
import {
  MysqlPoolConnectionAcquireEvent,
  MysqlPoolConnectionDestroyEvent,
  MysqlPoolConnectionReleaseEvent,
} from "./utils/events.ts";
import { logger } from "./utils/logger.ts";
import { MysqlError } from "./utils/errors.ts";

export interface MysqlClientPoolOptions
  extends MysqlConnectionOptions, SqlxConnectionPoolOptions {
}

export class MysqlPoolClient extends MysqlClient implements
  SqlxPoolConnection<
    MysqlParameterType,
    MysqlQueryOptions,
    MysqlPrepared,
    MysqlTransactionOptions,
    MySqlTransaction
  > {
  release(): Promise<void> {
    throw new Error("Method not implemented.");
  }
}

export class MysqlClientPool implements
  SqlxConnectionPool<
    MysqlParameterType,
    MysqlQueryOptions,
    MysqlPrepared,
    MysqlTransactionOptions,
    MySqlTransaction,
    SqlxPoolConnectionEventType,
    MysqlClientPoolOptions,
    MysqlPoolClient,
    DeferredStack
  > {
  readonly sqlxVersion: string = VERSION;
  readonly connectionUrl: string;
  readonly connectionOptions: MysqlClientPoolOptions;
  readonly queryOptions: MysqlQueryOptions;
  readonly eventTarget: EventTarget;
  readonly deferredStack: DeferredStack;
  get connected(): boolean {
    throw new Error("Method not implemented.");
  }

  constructor(
    connectionUrl: string | URL,
    connectionOptions: MysqlClientPoolOptions = {},
  ) {
    this.connectionUrl = connectionUrl.toString();
    this.connectionOptions = connectionOptions;
    this.queryOptions = connectionOptions;
    this.eventTarget = new EventTarget();
    this.deferredStack = new DeferredStack(connectionOptions);
  }

  async execute(
    sql: string,
    params?: (MysqlParameterType)[] | undefined,
    options?: MysqlQueryOptions | undefined,
  ): Promise<number | undefined> {
    const conn = await this.acquire();
    let res: number | undefined = undefined;
    let err: Error | undefined = undefined;
    try {
      res = await conn.execute(sql, params, options);
    } catch (e) {
      err = e;
    }
    await this.release(conn);
    if (err) {
      throw err;
    }
    return res;
  }
  query<
    T extends Row<MysqlParameterType> = Row<
      MysqlParameterType
    >,
  >(
    sql: string,
    params?: (MysqlParameterType)[] | undefined,
    options?: MysqlQueryOptions | undefined,
  ): Promise<T[]> {
    return this.#queryWrapper((conn) => conn.query<T>(sql, params, options));
  }
  queryOne<
    T extends Row<MysqlParameterType> = Row<
      MysqlParameterType
    >,
  >(
    sql: string,
    params?: (MysqlParameterType)[] | undefined,
    options?: MysqlQueryOptions | undefined,
  ): Promise<T | undefined> {
    return this.#queryWrapper((conn) => conn.queryOne<T>(sql, params, options));
  }
  async *queryMany<
    T extends Row<MysqlParameterType> = Row<
      MysqlParameterType
    >,
  >(
    sql: string,
    params?: (MysqlParameterType)[] | undefined,
    options?: MysqlQueryOptions | undefined,
  ): AsyncGenerator<T> {
    const conn = await this.acquire();
    let err: Error | undefined = undefined;
    try {
      for await (const row of conn.queryMany<T>(sql, params, options)) {
        yield row;
      }
    } catch (e) {
      err = e;
    }
    await this.release(conn);
    if (err) {
      throw err;
    }
  }
  queryArray<
    T extends ArrayRow<MysqlParameterType> = ArrayRow<
      MysqlParameterType
    >,
  >(
    sql: string,
    params?: (MysqlParameterType)[] | undefined,
    options?: MysqlQueryOptions | undefined,
  ): Promise<T[]> {
    return this.#queryWrapper((conn) =>
      conn.queryArray<T>(sql, params, options)
    );
  }
  queryOneArray<
    T extends ArrayRow<MysqlParameterType> = ArrayRow<
      MysqlParameterType
    >,
  >(
    sql: string,
    params?: (MysqlParameterType)[] | undefined,
    options?: MysqlQueryOptions | undefined,
  ): Promise<T | undefined> {
    return this.#queryWrapper((conn) =>
      conn.queryOneArray<T>(sql, params, options)
    );
  }
  async *queryManyArray<
    T extends ArrayRow<MysqlParameterType> = ArrayRow<
      MysqlParameterType
    >,
  >(
    sql: string,
    params?: (MysqlParameterType)[] | undefined,
    options?: MysqlQueryOptions | undefined,
  ): AsyncGenerator<T> {
    const conn = await this.acquire();
    let err: Error | undefined = undefined;
    try {
      for await (const row of conn.queryManyArray<T>(sql, params, options)) {
        yield row;
      }
    } catch (e) {
      err = e;
    }
    await this.release(conn);
    if (err) {
      throw err;
    }
  }
  sql<
    T extends Row<MysqlParameterType> = Row<
      MysqlParameterType
    >,
  >(
    strings: TemplateStringsArray,
    ...parameters: (MysqlParameterType)[]
  ): Promise<T[]> {
    return this.#queryWrapper((conn) => conn.sql<T>(strings, ...parameters));
  }
  sqlArray<
    T extends ArrayRow<MysqlParameterType> = ArrayRow<
      MysqlParameterType
    >,
  >(
    strings: TemplateStringsArray,
    ...parameters: (MysqlParameterType)[]
  ): Promise<T[]> {
    return this.#queryWrapper((conn) =>
      conn.sqlArray<T>(strings, ...parameters)
    );
  }

  beginTransaction(
    options?: {
      withConsistentSnapshot?: boolean | undefined;
      readWrite?: "READ WRITE" | "READ ONLY" | undefined;
    } | undefined,
  ): Promise<MySqlTransaction> {
    return this.#queryWrapper((conn) => conn.beginTransaction(options));
  }
  transaction<T>(fn: (t: MySqlTransaction) => Promise<T>): Promise<T> {
    return this.#queryWrapper((conn) => conn.transaction<T>(fn));
  }
  async connect(): Promise<void> {
    for (let i = 0; i < this.deferredStack.maxSize; i++) {
      const client = new MysqlPoolClient(
        this.connectionUrl,
        this.connectionOptions,
      );
      client.release = () => this.release(client);
      client.eventTarget = this.eventTarget;
      if (!this.connectionOptions.lazyInitialization) {
        await client.connect();
      }
      this.deferredStack.push(client);
    }
  }
  async close(): Promise<void> {
    for (const client of this.deferredStack.stack) {
      await client.close();
    }
  }
  addEventListener(
    type: SqlxPoolConnectionEventType,
    listener: EventListenerOrEventListenerObject | null,
    options?: boolean | AddEventListenerOptions | undefined,
  ): void {
    return this.eventTarget.addEventListener(type, listener, options);
  }
  removeEventListener(
    type: SqlxPoolConnectionEventType,
    callback: EventListenerOrEventListenerObject | null,
    options?: boolean | EventListenerOptions | undefined,
  ): void {
    return this.eventTarget.removeEventListener(type, callback, options);
  }

  dispatchEvent(event: Event): boolean {
    return this.eventTarget.dispatchEvent(event);
  }

  async acquire(): Promise<MysqlPoolClient> {
    const conn = await this.deferredStack.pop();
    dispatchEvent(new MysqlPoolConnectionAcquireEvent({ connection: conn }));
    return conn;
  }

  async release(connection: MysqlPoolClient): Promise<void> {
    dispatchEvent(
      new MysqlPoolConnectionReleaseEvent({ connection: connection }),
    );
    try {
      this.deferredStack.push(connection);
    } catch (e) {
      if (e instanceof SqlxError && e.message === "Max pool size reached") {
        logger().debug(e.message);
        await connection.close();
      } else {
        throw e;
      }
    }
  }

  async destroy(connection: MysqlPoolClient): Promise<void> {
    dispatchEvent(
      new MysqlPoolConnectionDestroyEvent({ connection: connection }),
    );
    await connection.close();
  }

  async #queryWrapper<T>(fn: (connection: MysqlClient) => Promise<T>) {
    const conn = await this.acquire();
    let res: T | undefined = undefined;
    let err: Error | undefined = undefined;
    try {
      res = await fn(conn);
    } catch (e) {
      err = e;
    }
    await this.release(conn);
    if (err) {
      throw err;
    }
    if (!res) {
      throw new MysqlError("No result");
    }
    return res;
  }

  async [Symbol.asyncDispose](): Promise<void> {
    await this.close();
  }
}
