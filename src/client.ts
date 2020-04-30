import { Connection, ExecuteResult } from "./connection.ts";
import { ResponseTimeoutError, WriteError } from "./constant/errors.ts";
import { DeferredStack } from "./deferred.ts";
import { log } from "./logger.ts";

/**
 * Clinet Config
 */
export interface ClientConfig {
  /** Database hostname */
  hostname?: string;
  /** Database username */
  username?: string;
  /** Database password */
  password?: string;
  /** Database port */
  port?: number;
  /** Database name */
  db?: string;
  /** Whether to Display Packet Debugging Information */
  debug?: boolean;
  /** Connect timeout */
  timeout?: number;
  /** Connection pool size default 1 */
  poolSize?: number;
  /** charset */
  charset?: string;
}

/** Transaction processor */
export interface TransactionProcessor<T> {
  (connection: Connection): Promise<T>;
}

/**
 * MySQL client
 */
export class Client {
  config: ClientConfig = {};
  private _pool?: DeferredStack<Connection>;
  private _connections: Connection[] = [];

  private async createConnection(): Promise<Connection> {
    let connection: Connection = new Connection(this);
    await connection.connect();
    return connection;
  }

  /** get pool info */
  get pool() {
    if (this._pool) {
      return {
        size: this._pool.size,
        maxSize: this._pool.maxSize,
        available: this._pool.available,
      };
    }
  }

  /**
   * connect to database
   * @param config config for client
   * @returns Clinet instance
   */
  async connect(config: ClientConfig): Promise<Client> {
    this.config = {
      hostname: "127.0.0.1",
      username: "root",
      port: 3306,
      poolSize: 1,
      ...config,
    };
    Object.freeze(this.config);
    this._connections = [];
    this._pool = new DeferredStack<Connection>(
      this.config.poolSize || 10,
      this._connections,
      this.createConnection.bind(this),
    );
    return this;
  }

  /**
   * excute query sql
   * @param sql query sql string
   * @param params query params
   */
  async query(sql: string, params?: any[]): Promise<any> {
    return await this.useConnection(async (connection) => {
      return await connection.query(sql, params);
    });
  }

  /**
   * excute sql
   * @param sql sql string
   * @param params query params
   */
  async execute(sql: string, params?: any[]): Promise<ExecuteResult> {
    return await this.useConnection(async (connection) => {
      return await connection.execute(sql, params);
    });
  }

  async useConnection<T>(fn: (conn: Connection) => Promise<T>) {
    if (!this._pool) {
      throw new Error("Unconnected");
    }
    const connection = await this._pool.pop();
    try {
      const result = await fn(connection);
      this._pool.push(connection);
      return result;
    } catch (error) {
      if (
        error instanceof WriteError ||
        error instanceof ResponseTimeoutError
      ) {
        this._pool.reduceSize();
      } else {
        this._pool.push(connection);
      }
      throw error;
    }
  }

  /**
   * Execute a transaction process, and the transaction successfully
   * returns the return value of the transaction process
   * @param processor transation processor
   */
  async transaction<T = any>(processor: TransactionProcessor<T>): Promise<T> {
    return await this.useConnection(async (connection) => {
      try {
        await connection.execute("BEGIN");
        const result = await processor(connection);
        await connection.execute("COMMIT");
        return result;
      } catch (error) {
        log.info(`ROLLBACK: ${error.message}`);
        await connection.execute("ROLLBACK");
        throw error;
      }
    });
  }

  /**
   * close connection
   */
  async close() {
    await Promise.all(this._connections.map((conn) => conn.close()));
  }
}
