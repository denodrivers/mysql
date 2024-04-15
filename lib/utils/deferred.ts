import {
  type SqlxConnectionPoolOptions,
  type SqlxDeferredStack,
  SqlxError,
} from "@halvardm/sqlx";
import type { MysqlPoolClient } from "../pool.ts";

export type DeferredStackOptions = SqlxConnectionPoolOptions;

export class DeferredStack implements SqlxDeferredStack<MysqlPoolClient> {
  readonly maxSize: number;
  stack: Array<MysqlPoolClient>;
  queue: Array<PromiseWithResolvers<MysqlPoolClient>>;

  get availableCount(): number {
    return this.stack.length;
  }
  get queuedCount(): number {
    return this.queue.length;
  }
  constructor(options: DeferredStackOptions) {
    this.maxSize = options.poolSize ?? 10;
    this.stack = [];
    this.queue = [];
  }

  push(client: MysqlPoolClient): void {
    if (this.queue.length) {
      const p = this.queue.shift()!;
      p.resolve(client);
    } else if (this.queue.length >= this.maxSize) {
      throw new SqlxError("Max pool size reached");
    } else {
      this.stack.push(client);
    }
  }

  async pop(): Promise<MysqlPoolClient> {
    const res = this.stack.pop();

    if (res) {
      await res.connect();
      return res;
    }

    const p = Promise.withResolvers<MysqlPoolClient>();
    this.queue.push(p);

    return p.promise;
  }
}
