import { Connection, ExecuteResult } from "./connection.ts";
import { DeferredStack } from "./deferred.ts";
import { config as logConfig, log } from "./logger.ts";
import { WriteError } from "./consttants/errors.ts";

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
  /** TODO: auto reconnect */
  reconnect?: boolean;
  /** Number of retries that failed in the link process */
  retry?: number;
  /** Connection pool size default 1 */
  pool?: number;
}

/** Transaction processor */
export interface TransactionProcessor<T> {
  (connection: Connection): Promise<T>;
}

/**
 * MySQL client
 */
export class Client {
  config: ClientConfig;
  private _pool: DeferredStack<Connection>;
  private _connections: Connection[] = [];

  private async createConnection(): Promise<Connection> {
    let connection: Connection = new Connection(this);
    await connection.connect();
    return connection;
  }

  /** get size of the pool, Number of connections created */
  get poolSize() {
    return this._pool.size;
  }

  /** get length of the pool, Number of connections available */
  get poolLength() {
    return this._pool.length;
  }

  /**
   * connect to database
   * @param config config for client
   * @returns Clinet instance
   */
  async connect(config: ClientConfig): Promise<Client> {
    await logConfig({
      debug: config.debug,
      logFile: "mysql.log"
    });
    this.config = {
      hostname: "127.0.0.1",
      username: "root",
      port: 3306,
      pool: 10,
      ...config
    };
    Object.freeze(this.config);
    this._connections = [];
    this._pool = new DeferredStack<Connection>(
      this.config.pool,
      this._connections,
      this.createConnection.bind(this)
    );
    return this;
  }

  /**
   * excute query sql
   * @param sql query sql string
   * @param params query params
   */
  async query(sql: string, params?: any[]): Promise<any> {
    const connection = await this._pool.pop();
    try {
      const result = await connection.query(sql, params);
      this._pool.push(connection);
      return result;
    } catch (error) {
      if (error instanceof WriteError) {
        this._pool.reduceSize();
      } else {
        this._pool.push(connection);
      }
      throw error;
    }
  }

  /**
   * excute sql
   * @param sql sql string
   * @param params query params
   */
  async execute(sql: string, params?: any[]): Promise<ExecuteResult> {
    const connection = await this._pool.pop();
    try {
      const result = await connection.execute(sql, params);
      this._pool.push(connection);
      return result;
    } catch (error) {
      if (error instanceof WriteError) {
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
    const connection = await this._pool.pop();
    try {
      await connection.execute("BEGIN");
      const result = await processor(connection);
      await connection.execute("COMMIT");
      this._pool.push(connection);
      return result;
    } catch (error) {
      if (error instanceof WriteError) {
        this._pool.reduceSize();
      } else {
        this._pool.push(connection);
      }
      log.info(`ROLLBACK: ${error.message}`);
      await connection.execute("ROLLBACK");
      throw error;
    }
  }

  /**
   * close connection
   */
  async close() {
    await Promise.all(this._connections.map(conn => conn.close()));
  }
}
