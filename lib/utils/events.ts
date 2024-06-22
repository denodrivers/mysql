import {
  type SqlxClientEventType,
  SqlxConnectableCloseEvent,
  SqlxConnectableConnectEvent,
  type SqlxConnectableEventInit,
  SqlxEventTarget,
  SqlxPoolConnectableAcquireEvent,
  SqlxPoolConnectableReleaseEvent,
  type SqlxPoolConnectionEventType,
} from "@halvardm/sqlx";
import type { MysqlConnectionOptions } from "../connection.ts";
import type { MysqlConnection } from "../connection.ts";
import type { MysqlClient } from "../client.ts";
import type { MysqlPoolClient } from "../pool.ts";

export class MysqlClientEventTarget extends SqlxEventTarget<
  MysqlConnectionOptions,
  MysqlConnection,
  SqlxClientEventType,
  MysqlClientEventInit,
  MysqlClientEvents
> {
}
export class MysqlPoolClientEventTarget extends SqlxEventTarget<
  MysqlConnectionOptions,
  MysqlConnection,
  SqlxPoolConnectionEventType,
  MysqlPoolEventInit,
  MysqlPoolEvents
> {
}

export type MysqlClientEventInit = SqlxConnectableEventInit<
  MysqlClient
>;

export type MysqlPoolEventInit = SqlxConnectableEventInit<
  MysqlPoolClient
>;

export class MysqlClientConnectEvent
  extends SqlxConnectableConnectEvent<MysqlClientEventInit> {}

export class MysqlClientCloseEvent
  extends SqlxConnectableCloseEvent<MysqlClientEventInit> {}
export class MysqlPoolConnectEvent
  extends SqlxConnectableConnectEvent<MysqlPoolEventInit> {}

export class MysqlPoolCloseEvent
  extends SqlxConnectableCloseEvent<MysqlPoolEventInit> {}

export class MysqlPoolAcquireEvent
  extends SqlxPoolConnectableAcquireEvent<MysqlPoolEventInit> {
}

export class MysqlPoolReleaseEvent
  extends SqlxPoolConnectableReleaseEvent<MysqlPoolEventInit> {
}

export type MysqlClientEvents =
  | MysqlClientConnectEvent
  | MysqlClientCloseEvent;

export type MysqlPoolEvents =
  | MysqlClientConnectEvent
  | MysqlClientCloseEvent
  | MysqlPoolAcquireEvent
  | MysqlPoolReleaseEvent;
