import { resolve } from "@std/path";
import { ConsoleHandler, setup } from "@std/log";
import { MODULE_NAME } from "./meta.ts";
import { parse } from "@std/yaml";
import type {
  MysqlPreparable,
  MysqlPreparedStatement,
  MysqlQueriable,
  MysqlTransaction,
  MysqlTransactionable,
} from "../core.ts";
import { assertEquals } from "@std/assert";
import {
  isSqlPreparable,
  isSqlTransaction,
  isSqlTransactionable,
} from "@stdext/sql";

type DockerCompose = {
  services: {
    [key: string]: {
      image: string;
      ports: string[];
      environment: Record<string, unknown>;
      volumes: string[];
    };
  };
};

type ServiceParsed = {
  name: string;
  port: string;
  database: string;
  // socket: string;
  url: string;
  // urlSocket: string;
};

setup({
  handlers: {
    console: new ConsoleHandler("DEBUG"),
  },
  loggers: {
    // configure default logger available via short-hand methods above
    default: {
      level: "WARN",
      handlers: ["console"],
    },
    [MODULE_NAME]: {
      level: "WARN",
      handlers: ["console"],
    },
  },
});

export const DIR_TMP_TEST = resolve(Deno.cwd(), "tmp_test");

const composeParsed = parse(
  Deno.readTextFileSync(resolve(Deno.cwd(), "compose.yml")),
  { "onWarning": console.warn },
) as DockerCompose;

export const services: ServiceParsed[] = Object.entries(composeParsed.services)
  .map(
    ([key, value]) => {
      const port = value.ports[0].split(":")[0];
      const database = Object.entries(value.environment).find(([e]) =>
        e.includes("DATABASE")
      )?.[1] as string;
      // const socket = resolve(value.volumes[0].split(":")[0])+"/mysqld.sock";
      const url = `mysql://root@0.0.0.0:${port}/${database}`;
      // const urlSocket = `${url}?socket=${socket}`;
      return {
        name: key,
        port,
        database,
        // socket,
        url,
        // urlSocket,
      };
    },
  );

export const URL_TEST_CONNECTION = services.find((s) => s.name === "mysql")
  ?.url as string;

export async function testQueriable(
  queriable: MysqlQueriable,
) {
  await queriable.execute("DELETE FROM sqltesttable");

  const resultExecute = await queriable.execute(
    "INSERT INTO sqltesttable (testcol) VALUES (?),(?),(?)",
    ["queriable 1", "queriable 2", "queriable 3"],
  );
  assertEquals(resultExecute, 3);

  const resultQuery = await queriable.query("SELECT * FROM sqltesttable");
  assertEquals(resultQuery, [
    { testcol: "queriable 1" },
    { testcol: "queriable 2" },
    { testcol: "queriable 3" },
  ]);

  const resultQueryOne = await queriable.queryOne(
    "SELECT * FROM sqltesttable WHERE testcol LIKE ?",
    ["queriable%"],
  );
  assertEquals(resultQueryOne, { testcol: "queriable 1" });

  const resultQueryMany = await Array.fromAsync(
    queriable.queryMany("SELECT * FROM sqltesttable WHERE testcol LIKE ?", [
      "queriable%",
    ]),
  );
  assertEquals(resultQueryMany, [
    { testcol: "queriable 1" },
    { testcol: "queriable 2" },
    { testcol: "queriable 3" },
  ]);

  const resultQueryArray = await queriable.queryArray(
    "SELECT * FROM sqltesttable WHERE testcol LIKE ?",
    ["queriable%"],
  );
  assertEquals(resultQueryArray, [
    ["queriable 1"],
    ["queriable 2"],
    ["queriable 3"],
  ]);

  const resultQueryOneArray = await queriable.queryOneArray(
    "SELECT * FROM sqltesttable WHERE testcol LIKE ?",
    ["queriable%"],
  );
  assertEquals(resultQueryOneArray, ["queriable 1"]);

  const resultQueryManyArray = await Array.fromAsync(
    queriable.queryManyArray(
      "SELECT * FROM sqltesttable WHERE testcol LIKE ?",
      ["queriable%"],
    ),
  );
  assertEquals(resultQueryManyArray, [
    ["queriable 1"],
    ["queriable 2"],
    ["queriable 3"],
  ]);

  const resultSql = await queriable
    .sql`SELECT * FROM sqltesttable WHERE testcol LIKE ${"queriable%"}`;
  assertEquals(resultSql, [
    { testcol: "queriable 1" },
    { testcol: "queriable 2" },
    { testcol: "queriable 3" },
  ]);

  const resultSqlArray = await queriable
    .sqlArray`SELECT * FROM sqltesttable WHERE testcol LIKE ${"queriable%"}`;
  assertEquals(resultSqlArray, [
    ["queriable 1"],
    ["queriable 2"],
    ["queriable 3"],
  ]);
}

export async function testPreparedStatement(
  preparedStatement: MysqlPreparedStatement,
) {
  const resultExecute = await preparedStatement.execute(["queriable%"]);
  assertEquals(resultExecute, undefined);

  const resultQuery = await preparedStatement.query(["queriable%"]);
  assertEquals(resultQuery, [
    { testcol: "queriable 1" },
    { testcol: "queriable 2" },
    { testcol: "queriable 3" },
  ]);

  const resultQueryOne = await preparedStatement.queryOne(["queriable%"]);
  assertEquals(resultQueryOne, { testcol: "queriable 1" });

  const resultQueryMany = await Array.fromAsync(
    preparedStatement.queryMany(["queriable%"]),
  );
  assertEquals(resultQueryMany, [
    { testcol: "queriable 1" },
    { testcol: "queriable 2" },
    { testcol: "queriable 3" },
  ]);

  const resultQueryArray = await preparedStatement.queryArray(["queriable%"]);
  assertEquals(resultQueryArray, [
    ["queriable 1"],
    ["queriable 2"],
    ["queriable 3"],
  ]);

  const resultQueryOneArray = await preparedStatement.queryOneArray([
    "queriable%",
  ]);
  assertEquals(resultQueryOneArray, ["queriable 1"]);

  const resultQueryManyArray = await Array.fromAsync(
    preparedStatement.queryManyArray(["queriable%"]),
  );
  assertEquals(resultQueryManyArray, [
    ["queriable 1"],
    ["queriable 2"],
    ["queriable 3"],
  ]);
}

export async function testPreparable(
  preparable: MysqlPreparable,
) {
  // Testing properties
  isSqlPreparable(preparable);

  // Testing inherited classes
  await testQueriable(preparable);

  // Testing methods
  const prepared = preparable.prepare(
    "SELECT * FROM sqltesttable WHERE testcol LIKE ?",
  );
  await testPreparedStatement(prepared);
}
export async function testTransaction(
  transaction: MysqlTransaction,
) {
  // Testing properties
  isSqlTransaction(transaction);

  // Testing inherited classes
  await testPreparable(transaction);
}
export async function testTransactionable(
  transactionable: MysqlTransactionable,
) {
  // Testing properties
  isSqlTransactionable(transactionable);

  // Testing inherited classes
  await testPreparable(transactionable);

  // Testing methods
  const transaction = await transactionable.beginTransaction();
  await testTransaction(transaction);
}
