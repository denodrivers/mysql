import { Client, ClientConfig, Connection } from "./mod.ts";
import { assertEquals, parse } from "./test.deps.ts";

const { DB_PORT, DB_NAME, DB_PASSWORD, DB_USER, DB_HOST, DB_SOCKPATH } = Deno
  .env.toObject();
const port = DB_PORT ? parseInt(DB_PORT) : 3306;
const db = DB_NAME || "test";
const password = DB_PASSWORD || "root";
const username = DB_USER || "root";
const hostname = DB_HOST || "127.0.0.1";
const sockPath = DB_SOCKPATH || "/var/run/mysqld/mysqld.sock";
const testMethods =
  Deno.env.get("TEST_METHODS")?.split(",") as ("tcp" | "unix")[] || ["tcp"];
const unixSocketOnly = testMethods.length === 1 && testMethods[0] === "unix";

const config: ClientConfig = {
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

const tests: (Parameters<typeof testWithClient>)[] = [];

export function testWithClient(
  fn: (client: Client) => void | Promise<void>,
  overrideConfig?: ClientConfig,
): void {
  tests.push([fn, overrideConfig]);
}

export function registerTests(methods: ("tcp" | "unix")[] = testMethods) {
  if (methods!.includes("tcp")) {
    tests.forEach(([fn, overrideConfig]) => {
      Deno.test({
        name: fn.name + " (TCP)",
        async fn() {
          await test({ ...config, ...overrideConfig }, fn);
        },
      });
    });
  }
  if (methods!.includes("unix")) {
    tests.forEach(([fn, overrideConfig]) => {
      Deno.test({
        name: fn.name + " (UNIX domain socket)",
        async fn() {
          await test(
            { ...config, socketPath: sockPath, ...overrideConfig },
            fn,
          );
        },
      });
    });
  }
}

async function test(
  config: ClientConfig,
  fn: (client: Client) => void | Promise<void>,
) {
  const resources = Deno.resources();
  const client = await new Client().connect(config);
  try {
    await fn(client);
  } finally {
    await client.close();
  }
  assertEquals(
    Deno.resources(),
    resources,
    "The client is leaking resources",
  );
}

export async function createTestDB() {
  const client = await new Client().connect({
    ...config,
    poolSize: 1,
    db: undefined,
    socketPath: unixSocketOnly ? sockPath : undefined,
  });
  await client.execute(`CREATE DATABASE IF NOT EXISTS ${db}`);
  await client.close();
}

export function isMariaDB(connection: Connection): boolean {
  return connection.serverVersion.includes("MariaDB");
}

export function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
