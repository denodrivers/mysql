import type {
  ArrayRow,
  Row,
  SqlPreparable,
  SqlPreparedStatement,
  SqlQueriable,
  SqlQueryOptions,
  SqlTransaction,
  SqlTransactionable,
  SqlTransactionOptions,
} from "@stdext/sql";
import {
  MysqlConnectable,
  type MysqlConnection,
  type MysqlConnectionOptions,
} from "./connection.ts";
import type { MysqlParameterType } from "./packets/parsers/result.ts";
import { MysqlTransactionError } from "./utils/errors.ts";

export interface MysqlQueryOptions extends SqlQueryOptions {
}

export interface MysqlTransactionOptions extends SqlTransactionOptions {
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

export class MysqlQueriable extends MysqlConnectable implements
  SqlQueriable<
    MysqlConnectionOptions,
    MysqlParameterType,
    MysqlQueryOptions,
    MysqlConnection
  > {
  declare options: MysqlConnectionOptions & MysqlQueryOptions;
  constructor(
    connection: MysqlQueriable["connection"],
    options: MysqlQueriable["options"] = {},
  ) {
    super(connection, options);
  }

  execute(
    sql: string,
    params?: MysqlParameterType[] | undefined,
    options?: MysqlQueryOptions | undefined,
  ): Promise<number | undefined> {
    return this.connection.execute(sql, params, options);
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
  queryMany<T extends Row<MysqlParameterType> = Row<MysqlParameterType>>(
    sql: string,
    params?: MysqlParameterType[],
    options?: MysqlQueryOptions | undefined,
  ): AsyncGenerator<T> {
    return this.connection.queryMany<T>(sql, params, options);
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
  queryManyArray<
    T extends ArrayRow<MysqlParameterType> = ArrayRow<MysqlParameterType>,
  >(
    sql: string,
    params?: MysqlParameterType[] | undefined,
    options?: MysqlQueryOptions | undefined,
  ): AsyncGenerator<T> {
    return this.connection.queryManyArray<T>(sql, params, options);
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
export class MysqlPreparedStatement extends MysqlConnectable
  implements
    SqlPreparedStatement<
      MysqlConnectionOptions,
      MysqlParameterType,
      MysqlQueryOptions,
      MysqlConnection
    > {
  declare options: MysqlConnectionOptions & MysqlQueryOptions;
  readonly sql: string;

  constructor(
    connection: MysqlPreparedStatement["connection"],
    sql: string,
    options: MysqlPreparedStatement["options"] = {},
  ) {
    super(connection, options);
    this.sql = sql;
  }

  execute(
    params?: MysqlParameterType[] | undefined,
    options?: MysqlQueryOptions | undefined,
  ): Promise<number | undefined> {
    return this.connection.execute(this.sql, params, options);
  }
  query<T extends Row<MysqlParameterType> = Row<MysqlParameterType>>(
    params?: MysqlParameterType[] | undefined,
    options?: MysqlQueryOptions | undefined,
  ): Promise<T[]> {
    return Array.fromAsync(this.queryMany<T>(params, options));
  }
  async queryOne<T extends Row<MysqlParameterType> = Row<MysqlParameterType>>(
    params?: MysqlParameterType[] | undefined,
    options?: MysqlQueryOptions | undefined,
  ): Promise<T | undefined> {
    const res = await this.query<T>(params, options);
    return res[0];
  }
  queryMany<T extends Row<MysqlParameterType> = Row<MysqlParameterType>>(
    params?: MysqlParameterType[] | undefined,
    options?: MysqlQueryOptions | undefined,
  ): AsyncGenerator<T> {
    return this.connection.queryMany<T>(this.sql, params, options);
  }
  queryArray<
    T extends ArrayRow<MysqlParameterType> = ArrayRow<MysqlParameterType>,
  >(
    params?: MysqlParameterType[] | undefined,
    options?: MysqlQueryOptions | undefined,
  ): Promise<T[]> {
    return Array.fromAsync(this.queryManyArray<T>(params, options));
  }
  async queryOneArray<
    T extends ArrayRow<MysqlParameterType> = ArrayRow<MysqlParameterType>,
  >(
    params?: MysqlParameterType[] | undefined,
    options?: MysqlQueryOptions | undefined,
  ): Promise<T | undefined> {
    const res = await this.queryArray<T>(params, options);
    return res[0];
  }
  queryManyArray<
    T extends ArrayRow<MysqlParameterType> = ArrayRow<MysqlParameterType>,
  >(
    params?: MysqlParameterType[] | undefined,
    options?: MysqlQueryOptions | undefined,
  ): AsyncGenerator<T> {
    return this.connection.queryManyArray<T>(this.sql, params, options);
  }
}

export class MysqlPreparable extends MysqlQueriable implements
  SqlPreparable<
    MysqlConnectionOptions,
    MysqlParameterType,
    MysqlQueryOptions,
    MysqlConnection,
    MysqlPreparedStatement
  > {
  prepare(
    sql: string,
    options?: MysqlQueryOptions,
  ): MysqlPreparedStatement {
    return new MysqlPreparedStatement(this.connection, sql, options);
  }
}

export class MysqlTransaction extends MysqlPreparable implements
  SqlTransaction<
    MysqlConnectionOptions,
    MysqlParameterType,
    MysqlQueryOptions,
    MysqlConnection,
    MysqlPreparedStatement,
    MysqlTransactionOptions
  > {
  declare readonly options:
    & MysqlConnectionOptions
    & MysqlQueryOptions;
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
    SqlTransactionable<
      MysqlConnectionOptions,
      MysqlParameterType,
      MysqlQueryOptions,
      MysqlConnection,
      MysqlPreparedStatement,
      MysqlTransactionOptions,
      MysqlTransaction
    > {
  declare readonly options:
    & MysqlConnectionOptions
    & MysqlQueryOptions;

  async beginTransaction(
    options?: MysqlTransactionOptions["beginTransactionOptions"],
  ): Promise<MysqlTransaction> {
    let sql = "START TRANSACTION";
    if (options?.withConsistentSnapshot) {
      sql += ` WITH CONSISTENT SNAPSHOT`;
    }

    if (options?.readWrite) {
      sql += ` ${options.readWrite}`;
    }

    await this.execute(sql);

    return new MysqlTransaction(this.connection, this.options);
  }

  async transaction<T>(
    fn: (t: MysqlTransaction) => Promise<T>,
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
