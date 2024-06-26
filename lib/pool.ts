import type {
  SqlClientPool,
  SqlClientPoolOptions,
  SqlPoolClient,
  SqlPoolClientOptions,
} from "@stdext/sql";
import { DeferredStack } from "@stdext/collections";
import {
  type MysqlPreparedStatement,
  type MysqlQueryOptions,
  type MysqlTransaction,
  MysqlTransactionable,
  type MysqlTransactionOptions,
} from "./core.ts";
import { MysqlConnection, type MysqlConnectionOptions } from "./connection.ts";
import type { MysqlParameterType } from "./packets/parsers/result.ts";
import {
  MysqlAcquireEvent,
  MysqlCloseEvent,
  MysqlConnectEvent,
  MysqlPoolClientEventTarget,
  MysqlReleaseEvent,
} from "./utils/events.ts";

export class MysqlPoolClient extends MysqlTransactionable
  implements
    SqlPoolClient<
      MysqlConnectionOptions,
      MysqlConnection,
      MysqlParameterType,
      MysqlQueryOptions,
      MysqlPreparedStatement,
      MysqlTransactionOptions,
      MysqlTransaction
    > {
  declare readonly options:
    & MysqlConnectionOptions
    & MysqlQueryOptions
    & SqlPoolClientOptions;
  #releaseFn?: () => Promise<void>;

  #disposed: boolean = false;
  get disposed(): boolean {
    return this.#disposed;
  }
  constructor(
    connection: MysqlPoolClient["connection"],
    options: MysqlPoolClient["options"] = {},
  ) {
    super(connection, options);
    if (this.options?.releaseFn) {
      this.#releaseFn = this.options.releaseFn;
    }
  }
  async release() {
    this.#disposed = true;
    await this.#releaseFn?.();
  }

  [Symbol.asyncDispose](): Promise<void> {
    return this.release();
  }
}

export class MysqlClientPool implements
  SqlClientPool<
    MysqlConnectionOptions,
    MysqlParameterType,
    MysqlQueryOptions,
    MysqlConnection,
    MysqlPreparedStatement,
    MysqlTransactionOptions,
    MysqlTransaction,
    MysqlPoolClient,
    MysqlPoolClientEventTarget
  > {
  declare readonly options:
    & MysqlConnectionOptions
    & MysqlQueryOptions
    & SqlClientPoolOptions;
  readonly connectionUrl: string;
  readonly eventTarget: MysqlPoolClientEventTarget;
  readonly deferredStack: DeferredStack<MysqlConnection>;

  #connected: boolean = false;

  get connected(): boolean {
    return this.#connected;
  }

  constructor(
    connectionUrl: string | URL,
    options: MysqlClientPool["options"] = {},
  ) {
    this.connectionUrl = connectionUrl.toString();
    this.options = options;
    this.eventTarget = new MysqlPoolClientEventTarget();
    this.deferredStack = new DeferredStack<MysqlConnection>({
      ...options,
      removeFn: async (element) => {
        await element._value.close();
      },
    });
  }

  async connect(): Promise<void> {
    for (let i = 0; i < this.deferredStack.maxSize; i++) {
      const conn = new MysqlConnection(
        this.connectionUrl,
        this.options,
      );

      if (!this.options.lazyInitialization) {
        await conn.connect();
        this.eventTarget.dispatchEvent(
          new MysqlConnectEvent({ connection: conn }),
        );
      }

      this.deferredStack.add(conn);
    }

    this.#connected = true;
  }

  async close(): Promise<void> {
    this.#connected = false;

    for (const el of this.deferredStack.elements) {
      this.eventTarget.dispatchEvent(
        new MysqlCloseEvent({ connection: el._value }),
      );
      await el.remove();
    }
  }

  async acquire(): Promise<MysqlPoolClient> {
    const el = await this.deferredStack.pop();

    if (!el.value.connected) {
      await el.value.connect();
    }

    this.eventTarget.dispatchEvent(
      new MysqlAcquireEvent({ connection: el.value }),
    );

    const c = new MysqlPoolClient(
      el.value,
      {
        ...this.options,
        releaseFn: async () => {
          this.eventTarget.dispatchEvent(
            new MysqlReleaseEvent({ connection: el._value }),
          );
          await el.release();
        },
      },
    );

    return c;
  }

  async [Symbol.asyncDispose](): Promise<void> {
    await this.close();
  }
}
