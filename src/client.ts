import { Connection } from "./connection.ts";
import { config as logConfig } from "./logger.ts";

export interface ClientConfig {
    hostname?: string;
    username?: string;
    password?: string;
    port?: number;
    db?: string;
    debug?: boolean
};

export class Client {
    config: ClientConfig;
    private connection: Connection;

    async connect(config: ClientConfig): Promise<Client> {
        logConfig({
            debug: config.debug,
            logFile: "mysql.log",
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

    async query(sql: string): Promise<any[]> {
        return await this.connection.query(sql);
    }
}