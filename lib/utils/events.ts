import {
  type SqlxConnectableBase,
  SqlxConnectionCloseEvent,
  SqlxConnectionConnectEvent,
  type SqlxEventInit,
  SqlxEventTarget,
  type SqlxEventType,
  SqlxPoolConnectionAcquireEvent,
  SqlxPoolConnectionDestroyEvent,
  SqlxPoolConnectionReleaseEvent,
} from "@halvardm/sqlx";
import type { MysqlConnectionOptions } from "../connection.ts";
import type { MysqlConnection } from "../connection.ts";

export class MysqlEventTarget extends SqlxEventTarget<
  MysqlConnectionOptions,
  MysqlConnection,
  SqlxEventType,
  MysqlClientConnectionEventInit,
  MysqlEvents
> {
}

export type MysqlClientConnectionEventInit = SqlxEventInit<
  SqlxConnectableBase<MysqlConnection>
>;

export class MysqlConnectionConnectEvent
  extends SqlxConnectionConnectEvent<MysqlClientConnectionEventInit> {}
export class MysqlConnectionCloseEvent
  extends SqlxConnectionCloseEvent<MysqlClientConnectionEventInit> {}

export class MysqlPoolConnectionAcquireEvent
  extends SqlxPoolConnectionAcquireEvent<MysqlClientConnectionEventInit> {
}

export class MysqlPoolConnectionReleaseEvent
  extends SqlxPoolConnectionReleaseEvent<MysqlClientConnectionEventInit> {
}

export class MysqlPoolConnectionDestroyEvent
  extends SqlxPoolConnectionDestroyEvent<MysqlClientConnectionEventInit> {
}

export type MysqlEvents =
  | MysqlConnectionConnectEvent
  | MysqlConnectionCloseEvent
  | MysqlPoolConnectionAcquireEvent
  | MysqlPoolConnectionReleaseEvent
  | MysqlPoolConnectionDestroyEvent;
