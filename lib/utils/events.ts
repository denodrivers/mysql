import {
  type SqlxConnectionEventInit,
  SqlxPoolConnectionAcquireEvent,
  SqlxPoolConnectionDestroyEvent,
  SqlxPoolConnectionReleaseEvent,
} from "@halvardm/sqlx";
import type { MysqlParameterType } from "../packets/parsers/result.ts";
import type {
  MysqlPrepared,
  MysqlQueryOptions,
  MySqlTransaction,
  MysqlTransactionOptions,
} from "../client.ts";
import type { MysqlPoolClient } from "../pool.ts";

export class MysqlPoolConnectionAcquireEvent
  extends SqlxPoolConnectionAcquireEvent<
    MysqlParameterType,
    MysqlQueryOptions,
    MysqlPrepared,
    MysqlTransactionOptions,
    MySqlTransaction,
    MysqlPoolClient,
    SqlxConnectionEventInit<
      MysqlParameterType,
      MysqlQueryOptions,
      MysqlPrepared,
      MysqlTransactionOptions,
      MySqlTransaction,
      MysqlPoolClient
    >
  > {
}

export class MysqlPoolConnectionReleaseEvent
  extends SqlxPoolConnectionReleaseEvent<
    MysqlParameterType,
    MysqlQueryOptions,
    MysqlPrepared,
    MysqlTransactionOptions,
    MySqlTransaction,
    MysqlPoolClient,
    SqlxConnectionEventInit<
      MysqlParameterType,
      MysqlQueryOptions,
      MysqlPrepared,
      MysqlTransactionOptions,
      MySqlTransaction,
      MysqlPoolClient
    >
  > {
}

export class MysqlPoolConnectionDestroyEvent
  extends SqlxPoolConnectionDestroyEvent<
    MysqlParameterType,
    MysqlQueryOptions,
    MysqlPrepared,
    MysqlTransactionOptions,
    MySqlTransaction,
    MysqlPoolClient,
    SqlxConnectionEventInit<
      MysqlParameterType,
      MysqlQueryOptions,
      MysqlPrepared,
      MysqlTransactionOptions,
      MySqlTransaction,
      MysqlPoolClient
    >
  > {
}
