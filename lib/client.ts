import {
  type ArrayRow,
  type Row,
  type SqlxConnection,
  SqlxConnectionCloseEvent,
  SqlxConnectionConnectEvent,
  type SqlxConnectionEventType,
  type SqlxPreparable,
  type SqlxPreparedQueriable,
  type SqlxQueriable,
  type SqlxQueryOptions,
  type SqlxTransactionable,
  type SqlxTransactionOptions,
  type SqlxTransactionQueriable,
  VERSION,
} from "@halvardm/sqlx";
import { MysqlConnection, type MysqlConnectionOptions } from "./connection.ts";
import { buildQuery } from "./packets/builders/query.ts";
import type { MysqlParameterType } from "./packets/parsers/result.ts";

export interface MysqlTransactionOptions extends SqlxTransactionOptions {
  beginTransactionOptions: {
    withConsistentSnapshot?: boolean;
    readWrite?: "READ WRITE" | "READ ONLY";
  };
  commitTransactionOptions: {
    chain?: boolean;
    release?: boolean;
  };
  rollbackTransactionOptions: {
    chain?: boolean;
    release?: boolean;
    savepoint?: string;
  };
}

export interface MysqlClientOptions extends MysqlConnectionOptions {
}

export interface MysqlQueryOptions extends SqlxQueryOptions {
}

/**
 * Prepared statement
 *
 * @todo implement prepared statements properly
 */
export class MysqlPrepared
  implements SqlxPreparedQueriable<MysqlParameterType, MysqlQueryOptions> {
  readonly sqlxVersion = VERSION;
  readonly queryOptions: MysqlQueryOptions;

  #sql: string;

  #queriable: MysqlQueriable;

  constructor(
    connection: MysqlConnection,
    sql: string,
    options: MysqlQueryOptions = {},
  ) {
    this.#queriable = new MysqlQueriable(connection);
    this.#sql = sql;
    this.queryOptions = options;
  }

  execute(
    params?: MysqlParameterType[] | undefined,
    _options?: MysqlQueryOptions | undefined,
  ): Promise<number | undefined> {
    return this.#queriable.execute(this.#sql, params);
  }
  query<T extends Row<MysqlParameterType> = Row<MysqlParameterType>>(
    params?: MysqlParameterType[] | undefined,
    options?: MysqlQueryOptions | undefined,
  ): Promise<T[]> {
    return this.#queriable.query(this.#sql, params, options);
  }
  queryOne<T extends Row<MysqlParameterType> = Row<MysqlParameterType>>(
    params?: MysqlParameterType[] | undefined,
    options?: MysqlQueryOptions | undefined,
  ): Promise<T | undefined> {
    return this.#queriable.queryOne(this.#sql, params, options);
  }
  queryMany<T extends Row<MysqlParameterType> = Row<MysqlParameterType>>(
    params?: MysqlParameterType[] | undefined,
    options?: MysqlQueryOptions | undefined,
  ): AsyncIterableIterator<T> {
    return this.#queriable.queryMany(this.#sql, params, options);
  }
  queryArray<
    T extends ArrayRow<MysqlParameterType> = ArrayRow<MysqlParameterType>,
  >(
    params?: MysqlParameterType[] | undefined,
    options?: MysqlQueryOptions | undefined,
  ): Promise<T[]> {
    return this.#queriable.queryArray(this.#sql, params, options);
  }
  queryOneArray<
    T extends ArrayRow<MysqlParameterType> = ArrayRow<MysqlParameterType>,
  >(
    params?: MysqlParameterType[] | undefined,
    options?: MysqlQueryOptions | undefined,
  ): Promise<T | undefined> {
    return this.#queriable.queryOneArray(this.#sql, params, options);
  }
  queryManyArray<
    T extends ArrayRow<MysqlParameterType> = ArrayRow<MysqlParameterType>,
  >(
    params?: MysqlParameterType[] | undefined,
    options?: MysqlQueryOptions | undefined,
  ): AsyncIterableIterator<T> {
    return this.#queriable.queryManyArray(this.#sql, params, options);
  }
}

export class MysqlQueriable
  implements SqlxQueriable<MysqlParameterType, MysqlQueryOptions> {
  protected readonly connection: MysqlConnection;
  readonly queryOptions: MysqlQueryOptions;
  readonly sqlxVersion: string = VERSION;

  constructor(
    connection: MysqlConnection,
    queryOptions: MysqlQueryOptions = {},
  ) {
    this.connection = connection;
    this.queryOptions = queryOptions;
  }

  execute(
    sql: string,
    params?: MysqlParameterType[] | undefined,
    _options?: MysqlQueryOptions | undefined,
  ): Promise<number | undefined> {
    const data = buildQuery(sql, params);
    return this.connection.executeRaw(data);
  }
  query<T extends Row<MysqlParameterType> = Row<MysqlParameterType>>(
    sql: string,
    params?: MysqlParameterType[] | undefined,
    options?: MysqlQueryOptions | undefined,
  ): Promise<T[]> {
    return Array.fromAsync(this.queryMany<T>(sql, params, options));
  }
  async queryOne<T extends Row<MysqlParameterType> = Row<MysqlParameterType>>(
    sql: string,
    params?: MysqlParameterType[] | undefined,
    options?: MysqlQueryOptions | undefined,
  ): Promise<T | undefined> {
    const res = await this.query<T>(sql, params, options);
    return res[0];
  }
  async *queryMany<T extends Row<MysqlParameterType> = Row<MysqlParameterType>>(
    sql: string,
    params?: MysqlParameterType[],
    options?: MysqlQueryOptions | undefined,
  ): AsyncGenerator<T> {
    const data = buildQuery(sql, params);
    for await (
      const res of this.connection.queryManyObjectRaw<T>(data, options)
    ) {
      yield res;
    }
  }

  queryArray<
    T extends ArrayRow<MysqlParameterType> = ArrayRow<MysqlParameterType>,
  >(
    sql: string,
    params?: MysqlParameterType[] | undefined,
    options?: MysqlQueryOptions | undefined,
  ): Promise<T[]> {
    return Array.fromAsync(this.queryManyArray<T>(sql, params, options));
  }
  async queryOneArray<
    T extends ArrayRow<MysqlParameterType> = ArrayRow<MysqlParameterType>,
  >(
    sql: string,
    params?: MysqlParameterType[] | undefined,
    options?: MysqlQueryOptions | undefined,
  ): Promise<T | undefined> {
    const res = await this.queryArray<T>(sql, params, options);
    return res[0];
  }
  async *queryManyArray<
    T extends ArrayRow<MysqlParameterType> = ArrayRow<MysqlParameterType>,
  >(
    sql: string,
    params?: MysqlParameterType[] | undefined,
    options?: MysqlQueryOptions | undefined,
  ): AsyncIterableIterator<T> {
    const data = buildQuery(sql, params);
    for await (
      const res of this.connection.queryManyArrayRaw<T>(data, options)
    ) {
      yield res;
    }
  }
  sql<T extends Row<MysqlParameterType> = Row<MysqlParameterType>>(
    strings: TemplateStringsArray,
    ...parameters: MysqlParameterType[]
  ): Promise<T[]> {
    return this.query(strings.join("?"), parameters);
  }
  sqlArray<
    T extends ArrayRow<MysqlParameterType> = ArrayRow<MysqlParameterType>,
  >(
    strings: TemplateStringsArray,
    ...parameters: MysqlParameterType[]
  ): Promise<T[]> {
    return this.queryArray(strings.join("?"), parameters);
  }
}

export class MysqlPreparable extends MysqlQueriable
  implements
    SqlxPreparable<MysqlParameterType, MysqlQueryOptions, MysqlPrepared> {
  prepare(sql: string, options?: MysqlQueryOptions | undefined): MysqlPrepared {
    return new MysqlPrepared(this.connection, sql, options);
  }
}

export class MySqlTransaction extends MysqlPreparable
  implements
    SqlxTransactionQueriable<
      MysqlParameterType,
      MysqlQueryOptions,
      MysqlTransactionOptions
    > {
  async commitTransaction(
    options?: MysqlTransactionOptions["commitTransactionOptions"],
  ): Promise<void> {
    let sql = "COMMIT";

    if (options?.chain === true) {
      sql += " AND CHAIN";
    } else if (options?.chain === false) {
      sql += " AND NO CHAIN";
    }

    if (options?.release === true) {
      sql += " RELEASE";
    } else if (options?.release === false) {
      sql += " NO RELEASE";
    }
    await this.execute(sql);
  }
  async rollbackTransaction(
    options?: MysqlTransactionOptions["rollbackTransactionOptions"],
  ): Promise<void> {
    let sql = "ROLLBACK";

    if (options?.savepoint) {
      sql += ` TO ${options.savepoint}`;
      await this.execute(sql);
      return;
    }

    if (options?.chain === true) {
      sql += " AND CHAIN";
    } else if (options?.chain === false) {
      sql += " AND NO CHAIN";
    }

    if (options?.release === true) {
      sql += " RELEASE";
    } else if (options?.release === false) {
      sql += " NO RELEASE";
    }

    await this.execute(sql);
  }
  async createSavepoint(name: string = `\t_bm.\t`): Promise<void> {
    await this.execute(`SAVEPOINT ${name}`);
  }
  async releaseSavepoint(name: string = `\t_bm.\t`): Promise<void> {
    await this.execute(`RELEASE SAVEPOINT ${name}`);
  }
}

/**
 * Represents a queriable class that can be used to run transactions.
 */
export class MysqlTransactionable extends MysqlPreparable
  implements
    SqlxTransactionable<
      MysqlParameterType,
      MysqlQueryOptions,
      MysqlTransactionOptions,
      MySqlTransaction
    > {
  async beginTransaction(
    options?: MysqlTransactionOptions["beginTransactionOptions"],
  ): Promise<MySqlTransaction> {
    let sql = "START TRANSACTION";
    if (options?.withConsistentSnapshot) {
      sql += ` WITH CONSISTENT SNAPSHOT`;
    }

    if (options?.readWrite) {
      sql += ` ${options.readWrite}`;
    }

    await this.execute(sql);

    return new MySqlTransaction(this.connection, this.queryOptions);
  }

  async transaction<T>(
    fn: (t: MySqlTransaction) => Promise<T>,
    options?: MysqlTransactionOptions,
  ): Promise<T> {
    const transaction = await this.beginTransaction(
      options?.beginTransactionOptions,
    );

    try {
      const result = await fn(transaction);
      await transaction.commitTransaction(options?.commitTransactionOptions);
      return result;
    } catch (error) {
      await transaction.rollbackTransaction(
        options?.rollbackTransactionOptions,
      );
      throw error;
    }
  }
}

/**
 * MySQL client
 */
export class MysqlClient extends MysqlTransactionable implements
  SqlxConnection<
    MysqlParameterType,
    MysqlQueryOptions,
    MysqlPrepared,
    MysqlTransactionOptions,
    MySqlTransaction,
    SqlxConnectionEventType,
    MysqlConnectionOptions
  > {
  readonly connectionUrl: string;
  readonly connectionOptions: MysqlConnectionOptions;
  eventTarget: EventTarget;
  get connected(): boolean {
    throw new Error("Method not implemented.");
  }

  constructor(
    connectionUrl: string | URL,
    connectionOptions: MysqlClientOptions = {},
  ) {
    const conn = new MysqlConnection(connectionUrl, connectionOptions);
    super(conn);
    this.connectionUrl = conn.connectionUrl;
    this.connectionOptions = conn.connectionOptions;
    this.eventTarget = new EventTarget();
  }
  async connect(): Promise<void> {
    await this.connection.connect();
    this.dispatchEvent(new SqlxConnectionConnectEvent());
  }
  async close(): Promise<void> {
    this.dispatchEvent(new SqlxConnectionCloseEvent());
    await this.connection.close();
  }
  async [Symbol.asyncDispose](): Promise<void> {
    await this.close();
  }
  addEventListener(
    type: SqlxConnectionEventType,
    listener: EventListenerOrEventListenerObject | null,
    options?: boolean | AddEventListenerOptions,
  ): void {
    this.eventTarget.addEventListener(type, listener, options);
  }
  removeEventListener(
    type: SqlxConnectionEventType,
    callback: EventListenerOrEventListenerObject | null,
    options?: boolean | EventListenerOptions,
  ): void {
    this.eventTarget.removeEventListener(type, callback, options);
  }
  dispatchEvent(event: Event): boolean {
    return this.eventTarget.dispatchEvent(event);
  }
}
