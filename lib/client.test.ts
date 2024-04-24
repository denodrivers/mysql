import { MysqlClient } from "./client.ts";
import { QUERIES, services } from "./utils/testing.ts";
import { clientTest } from "@halvardm/sqlx/testing";

Deno.test("Client Test", async (t) => {
  for (const service of services) {
    await t.step(`Testing ${service.name}`, async (t) => {
      await t.step(`TCP`, async (t) => {
        await clientTest({
          t,
          Client: MysqlClient,
          connectionUrl: service.url,
          connectionOptions: {},
          queries: QUERIES,
        });
      });

      // Enable once socket connection issue is fixed
      //
      // await t.step(`UNIX Socket`, async (t) => {
      //   await implementationTest({
      //     t,
      //     Client: MysqlClient,
      //     // deno-lint-ignore no-explicit-any
      //     PoolClient: MysqlClientPool as any,
      //     connectionUrl: service.urlSocket,
      //     connectionOptions: {},
      //     queries: {
      //       createTable:
      //         "CREATE TABLE IF NOT EXISTS sqlxtesttable (testcol TEXT)",
      //       dropTable: "DROP TABLE IF EXISTS sqlxtesttable",
      //       insertOneToTable: "INSERT INTO sqlxtesttable (testcol) VALUES (?)",
      //       insertManyToTable:
      //         "INSERT INTO sqlxtesttable (testcol) VALUES (?),(?),(?)",
      //       selectOneFromTable:
      //         "SELECT * FROM sqlxtesttable WHERE testcol = ? LIMIT 1",
      //       selectByMatchFromTable:
      //         "SELECT * FROM sqlxtesttable WHERE testcol = ?",
      //       selectManyFromTable: "SELECT * FROM sqlxtesttable",
      //       select1AsString: "SELECT '1' as result",
      //       select1Plus1AsNumber: "SELECT 1+1 as result",
      //       deleteByMatchFromTable:
      //         "DELETE FROM sqlxtesttable WHERE testcol = ?",
      //       deleteAllFromTable: "DELETE FROM sqlxtesttable",
      //     },
      //   });
      // });
    });
  }
});
