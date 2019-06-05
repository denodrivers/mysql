import { Connection, ExecuteResult } from "./connection.ts";
import { DeferredStack } from "./deferred.ts";
import { config as logConfig } from "./logger.ts";

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

/**
 * MySQL client
 */
export class Client {
  config: ClientConfig;
  connections: DeferredStack<Connection>;
  private _connections: Connection[] = [];

  private async getConnection(): Promise<Connection> {
    let connection: Connection = new Connection(this);
    await connection.connect();
    return connection;
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
      pool: 1,
      ...config
    };
    this._connections = [];
    this.connections = new DeferredStack<Connection>(
      this.config.pool,
      this._connections,
      this.getConnection.bind(this)
    );
    return this;
  }

  /**
   * excute query sql
   * @param sql query sql string
   * @param params query params
   */
  async query(sql: string, params?: any[]): Promise<any> {
    const connection = await this.connections.pop();
    const result = await connection.query(sql, params);
    this.connections.push(connection);
    return result;
  }

  /**
   * excute sql
   * @param sql sql string
   * @param params query params
   */
  async execute(sql: string, params?: any[]): Promise<ExecuteResult> {
    const connection = await this.connections.pop();
    const result = await connection.execute(sql, params);
    this.connections.push(connection);
    return result;
  }

  /**
   * close connection
   */
  async close() {
    await Promise.all(this._connections.map(conn => conn.close()));
  }
}
