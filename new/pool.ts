import { Connection } from './collection.ts';
import { DeferredStack } from './deferred.ts';
import { log } from './logger.ts';

export class PoolConnection extends Connection {
  _pool?: ConnectionPool = undefined;

  private _idleTimer?: number = undefined;
  private _idle = false;

  /**
   * Should be called by the pool.
   */
  enterIdle() {
    this._idle = true;
    if (this.config.idleTimeout) {
      this._idleTimer = setTimeout(() => {
        log.info('connection idle timeout');
        this._pool!.remove(this);
        try {
          this.close();
        } catch (error) {
          log.warning(`error closing idle connection`, error);
        }
      }, this.config.idleTimeout);
    }
  }

  /**
   * Should be called by the pool.
   */
  exitIdle() {
    this._idle = false;
    if (this._idleTimer !== undefined) {
      clearTimeout(this._idleTimer);
    }
  }

  /**
   * Remove the connection from the pool permanently, when the connection is not usable.
   */
  removeFromPool() {
    this._pool!.reduceSize();
    this._pool = undefined;
  }

  returnToPool() {
    this._pool?.push(this);
  }
}

export class ConnectionPool {
  #deferred: DeferredStack<PoolConnection>;
  #connections: PoolConnection[] = [];
  #closed: boolean = false;

  constructor(maxSize: number, creator: () => Promise<PoolConnection>) {
    this.#deferred = new DeferredStack(maxSize, this.#connections, async () => {
      const conn = await creator();
      conn._pool = this;
      return conn;
    });
  }

  get info() {
    return {
      size: this.#deferred.size,
      maxSize: this.#deferred.maxSize,
      available: this.#deferred.available,
    };
  }

  push(conn: PoolConnection) {
    if (this.#closed) {
      conn.close();
      this.reduceSize();
    }
    if (this.#deferred.push(conn)) {
      conn.enterIdle();
    }
  }

  async pop(): Promise<PoolConnection> {
    if (this.#closed) {
      throw new Error('Connection pool is closed');
    }
    let conn = this.#deferred.tryPopAvailable();
    if (conn) {
      conn.exitIdle();
    } else {
      conn = await this.#deferred.pop();
    }
    return conn;
  }

  remove(conn: PoolConnection) {
    return this.#deferred.remove(conn);
  }

  /**
   * Close the pool and all connections in the pool.
   *
   * After closing, pop() will throw an error,
   * push() will close the connection immediately.
   */
  close() {
    let conn: PoolConnection | undefined;
    while ((conn = this.#deferred.tryPopAvailable())) {
      conn.exitIdle();
      conn.close();
      this.reduceSize();
    }
  }

  reduceSize() {
    this.#deferred.reduceSize();
  }
}
