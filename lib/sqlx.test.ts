import { MysqlClient } from "./client.ts";
import { MysqlClientPool } from "./pool.ts";
import {
  URL_TEST_CONNECTION,
  URL_TEST_CONNECTION_MARIADB,
} from "./utils/testing.ts";
import { implementationTest } from "@halvardm/sqlx/testing";

Deno.test("MySQL SQLx", async (t) => {
  await implementationTest({
    t,
    Client: MysqlClient,
    // deno-lint-ignore no-explicit-any
    PoolClient: MysqlClientPool as any,
    connectionUrl: URL_TEST_CONNECTION,
    connectionOptions: {},
    queries: {
      createTable: "CREATE TABLE IF NOT EXISTS sqlxtesttable (testcol TEXT)",
      dropTable: "DROP TABLE IF EXISTS sqlxtesttable",
      insertOneToTable: "INSERT INTO sqlxtesttable (testcol) VALUES (?)",
      insertManyToTable:
        "INSERT INTO sqlxtesttable (testcol) VALUES (?),(?),(?)",
      selectOneFromTable:
        "SELECT * FROM sqlxtesttable WHERE testcol = ? LIMIT 1",
      selectByMatchFromTable: "SELECT * FROM sqlxtesttable WHERE testcol = ?",
      selectManyFromTable: "SELECT * FROM sqlxtesttable",
      select1AsString: "SELECT '1' as result",
      select1Plus1AsNumber: "SELECT 1+1 as result",
      deleteByMatchFromTable: "DELETE FROM sqlxtesttable WHERE testcol = ?",
      deleteAllFromTable: "DELETE FROM sqlxtesttable",
    },
  });
});

Deno.test("MariaDB SQLx", async (t) => {
  await implementationTest({
    t,
    Client: MysqlClient,
    // deno-lint-ignore no-explicit-any
    PoolClient: MysqlClientPool as any,
    connectionUrl: URL_TEST_CONNECTION_MARIADB,
    connectionOptions: {},
    queries: {
      createTable: "CREATE TABLE IF NOT EXISTS sqlxtesttable (testcol TEXT)",
      dropTable: "DROP TABLE IF EXISTS sqlxtesttable",
      insertOneToTable: "INSERT INTO sqlxtesttable (testcol) VALUES (?)",
      insertManyToTable:
        "INSERT INTO sqlxtesttable (testcol) VALUES (?),(?),(?)",
      selectOneFromTable:
        "SELECT * FROM sqlxtesttable WHERE testcol = ? LIMIT 1",
      selectByMatchFromTable: "SELECT * FROM sqlxtesttable WHERE testcol = ?",
      selectManyFromTable: "SELECT * FROM sqlxtesttable",
      select1AsString: "SELECT '1' as result",
      select1Plus1AsNumber: "SELECT 1+1 as result",
      deleteByMatchFromTable: "DELETE FROM sqlxtesttable WHERE testcol = ?",
      deleteAllFromTable: "DELETE FROM sqlxtesttable",
    },
  });
});
