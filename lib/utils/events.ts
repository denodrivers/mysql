import {
  SqlAcquireEvent,
  type SqlClientEventType,
  SqlCloseEvent,
  SqlConnectEvent,
  type SqlConnectionEventInit,
  SqlEventTarget,
  type SqlPoolConnectionEventType,
  SqlReleaseEvent,
} from "@stdext/sql";
import type { MysqlConnection, MysqlConnectionOptions } from "../connection.ts";

export class MysqlClientEventTarget extends SqlEventTarget<
  MysqlConnectionOptions,
  MysqlConnection,
  SqlClientEventType,
  MysqlConnectionEventInit,
  MysqlClientEvents
> {
}
export class MysqlPoolClientEventTarget extends SqlEventTarget<
  MysqlConnectionOptions,
  MysqlConnection,
  SqlPoolConnectionEventType,
  MysqlConnectionEventInit,
  MysqlPoolEvents
> {
}

export type MysqlConnectionEventInit = SqlConnectionEventInit<
  MysqlConnection
>;

export class MysqlConnectEvent
  extends SqlConnectEvent<MysqlConnectionEventInit> {}

export class MysqlCloseEvent extends SqlCloseEvent<MysqlConnectionEventInit> {}

export class MysqlAcquireEvent
  extends SqlAcquireEvent<MysqlConnectionEventInit> {}

export class MysqlReleaseEvent
  extends SqlReleaseEvent<MysqlConnectionEventInit> {
}

export type MysqlClientEvents =
  | MysqlConnectEvent
  | MysqlCloseEvent;

export type MysqlPoolEvents =
  | MysqlClientEvents
  | MysqlAcquireEvent
  | MysqlReleaseEvent;
