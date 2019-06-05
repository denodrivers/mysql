import { Connection, ExecuteResult } from "./connection.ts";
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
}

/**
 * MySQL client
 */
export class Client {
  config: ClientConfig;
  connection: Connection;

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
      ...config
    };
    this.connection = new Connection(this);
    await this.connection.connect();
    return this;
  }

  /**
   * excute query sql
   * @param sql query sql string
   * @param params query params
   */
  async query(sql: string, params?: any[]): Promise<any> {
    return await this.connection.query(sql, params);
  }

  /**
   * excute sql
   * @param sql sql string
   * @param params query params
   */
  async execute(sql: string, params?: any[]): Promise<ExecuteResult> {
    return await this.connection.execute(sql, params);
  }

  /**
   * close connection
   */
  async close() {
    await this.connection.close();
  }
}
