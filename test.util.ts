import { Client } from "./mod.ts";

const { DB_PORT, DB_NAME, DB_PASSWORD, DB_USER, DB_HOST } = Deno.env.toObject();
const port = DB_PORT ? parseInt(DB_PORT) : 3306;
const db = DB_NAME || "test";
const password = DB_PASSWORD;
const username = DB_USER || "root";
const hostname = DB_HOST || "127.0.0.1";

const config = {
  timeout: 10000,
  poolSize: 3,
  debug: true,
  hostname,
  username,
  port,
  db,
  charset: "utf8mb4",
  password,
};

export function testWithClient(fn: (client: Client) => void | Promise<void>) {
  Deno.test({
    name: fn.name,
    async fn() {
      const client = await new Client().connect(config);
      try {
        await fn(client);
        await client.close();
      } catch (error) {
        await client.close();
        throw error;
      }
    },
  });
}

export async function createTestDB() {
  const client = await new Client().connect({
    ...config,
    poolSize: 1,
    db: undefined,
  });
  await client.execute(`CREATE DATABASE IF NOT EXISTS ${db}`);
  await client.close();
}
