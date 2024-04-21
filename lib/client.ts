import {
  type ArrayRow,
  type Row,
  SqlxBase,
  type SqlxClient,
  SqlxConnectionCloseEvent,
  SqlxConnectionConnectEvent,
  type SqlxPreparable,
  type SqlxPreparedQueriable,
  type SqlxQueriable,
  type SqlxQueryOptions,
  type SqlxTransactionable,
  type SqlxTransactionOptions,
  type SqlxTransactionQueriable,
} from "@halvardm/sqlx";
import { MysqlConnection, type MysqlConnectionOptions } from "./connection.ts";
import { buildQuery } from "./packets/builders/query.ts";
import type { MysqlParameterType } from "./packets/parsers/result.ts";
import { MysqlTransactionError } from "./utils/errors.ts";
import { MysqlEventTarget } from "./utils/events.ts";

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

export class MysqlQueriable extends SqlxBase implements
  SqlxQueriable<
    MysqlEventTarget,
    MysqlConnectionOptions,
    MysqlConnection,
    MysqlParameterType,
    MysqlQueryOptions
  > {
  readonly connection: MysqlConnection;
  readonly queryOptions: MysqlQueryOptions;

  get connected(): boolean {
    return this.connection.connected;
  }

  constructor(
    connection: MysqlConnection,
    queryOptions: MysqlQueryOptions = {},
  ) {
    super();
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
  ): AsyncGenerator<T> {
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

/**
 * Prepared statement
 *
 * @todo implement prepared statements properly
 */
export class MysqlPrepared extends SqlxBase implements
  SqlxPreparedQueriable<
    MysqlEventTarget,
    MysqlConnectionOptions,
    MysqlConnection,
    MysqlParameterType,
    MysqlQueryOptions
  > {
  readonly sql: string;
  readonly queryOptions: MysqlQueryOptions;

  #queriable: MysqlQueriable;

  connection: MysqlConnection;

  get connected(): boolean {
    return this.connection.connected;
  }

  constructor(
    connection: MysqlConnection,
    sql: string,
    options: MysqlQueryOptions = {},
  ) {
    super();
    this.connection = connection;
    this.sql = sql;
    this.queryOptions = options;
    this.#queriable = new MysqlQueriable(connection, this.queryOptions);
  }

  execute(
    params?: MysqlParameterType[] | undefined,
    _options?: MysqlQueryOptions | undefined,
  ): Promise<number | undefined> {
    return this.#queriable.execute(this.sql, params);
  }
  query<T extends Row<MysqlParameterType> = Row<MysqlParameterType>>(
    params?: MysqlParameterType[] | undefined,
    options?: MysqlQueryOptions | undefined,
  ): Promise<T[]> {
    return this.#queriable.query(this.sql, params, options);
  }
  queryOne<T extends Row<MysqlParameterType> = Row<MysqlParameterType>>(
    params?: MysqlParameterType[] | undefined,
    options?: MysqlQueryOptions | undefined,
  ): Promise<T | undefined> {
    return this.#queriable.queryOne(this.sql, params, options);
  }
  queryMany<T extends Row<MysqlParameterType> = Row<MysqlParameterType>>(
    params?: MysqlParameterType[] | undefined,
    options?: MysqlQueryOptions | undefined,
  ): AsyncGenerator<T> {
    return this.#queriable.queryMany<T>(this.sql, params, options);
  }
  queryArray<
    T extends ArrayRow<MysqlParameterType> = ArrayRow<MysqlParameterType>,
  >(
    params?: MysqlParameterType[] | undefined,
    options?: MysqlQueryOptions | undefined,
  ): Promise<T[]> {
    return this.#queriable.queryArray(this.sql, params, options);
  }
  queryOneArray<
    T extends ArrayRow<MysqlParameterType> = ArrayRow<MysqlParameterType>,
  >(
    params?: MysqlParameterType[] | undefined,
    options?: MysqlQueryOptions | undefined,
  ): Promise<T | undefined> {
    return this.#queriable.queryOneArray(this.sql, params, options);
  }
  queryManyArray<
    T extends ArrayRow<MysqlParameterType> = ArrayRow<MysqlParameterType>,
  >(
    params?: MysqlParameterType[] | undefined,
    options?: MysqlQueryOptions | undefined,
  ): AsyncGenerator<T> {
    return this.#queriable.queryManyArray(this.sql, params, options);
  }
}

export class MysqlPreparable extends MysqlQueriable implements
  SqlxPreparable<
    MysqlEventTarget,
    MysqlConnectionOptions,
    MysqlConnection,
    MysqlParameterType,
    MysqlQueryOptions,
    MysqlPrepared
  > {
  prepare(sql: string, options?: MysqlQueryOptions | undefined): MysqlPrepared {
    return new MysqlPrepared(this.connection, sql, options);
  }
}

export class MySqlTransaction extends MysqlPreparable
  implements
    SqlxTransactionQueriable<
      MysqlEventTarget,
      MysqlConnectionOptions,
      MysqlConnection,
      MysqlParameterType,
      MysqlQueryOptions,
      MysqlTransactionOptions
    > {
  #inTransaction: boolean = true;
  get inTransaction(): boolean {
    return this.connected && this.#inTransaction;
  }

  get connected(): boolean {
    if (!this.#inTransaction) {
      throw new MysqlTransactionError(
        "Transaction is not active, create a new one using beginTransaction",
      );
    }

    return super.connected;
  }

  async commitTransaction(
    options?: MysqlTransactionOptions["commitTransactionOptions"],
  ): Promise<void> {
    try {
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
    } catch (e) {
      this.#inTransaction = false;
      throw e;
    }
  }
  async rollbackTransaction(
    options?: MysqlTransactionOptions["rollbackTransactionOptions"],
  ): Promise<void> {
    try {
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
    } catch (e) {
      this.#inTransaction = false;
      throw e;
    }
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
      MysqlEventTarget,
      MysqlConnectionOptions,
      MysqlConnection,
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
  SqlxClient<
    MysqlEventTarget,
    MysqlConnectionOptions,
    MysqlConnection,
    MysqlParameterType,
    MysqlQueryOptions,
    MysqlPrepared,
    MysqlTransactionOptions,
    MySqlTransaction
  > {
  eventTarget: MysqlEventTarget;
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
    this.eventTarget = new MysqlEventTarget();
  }
  async connect(): Promise<void> {
    await this.connection.connect();
    this.eventTarget.dispatchEvent(
      new SqlxConnectionConnectEvent({ connectable: this }),
    );
  }
  async close(): Promise<void> {
    this.eventTarget.dispatchEvent(
      new SqlxConnectionCloseEvent({ connectable: this }),
    );
    await this.connection.close();
  }

  async [Symbol.asyncDispose](): Promise<void> {
    await this.close();
  }
}
