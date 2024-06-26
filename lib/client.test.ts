import { MysqlClient } from "./client.ts";
import { services, testTransactionable } from "./utils/testing.ts";
import { testClientConnection, testSqlClient } from "@stdext/sql/testing";

Deno.test("Client Test", async (t) => {
  for (const service of services) {
    await t.step(`Testing ${service.name}`, async (t) => {
      testSqlClient(new MysqlClient(service.url), {
        connectionUrl: service.url,
        options: {},
      });

      async function connectionTest(t: Deno.TestContext) {
        await testClientConnection(t, MysqlClient, [service.url, {}]);
        await using client = new MysqlClient(service.url);
        await client.connect();
        await client.execute("DROP TABLE IF EXISTS sqltesttable");
        await client.execute(
          "CREATE TABLE IF NOT EXISTS sqltesttable (testcol TEXT)",
        );
        try {
          await testTransactionable(client);
        } finally {
          await client.execute("DROP TABLE IF EXISTS sqltesttable");
        }
      }

      await t.step(`TCP`, async (t) => {
        await connectionTest(t);
      });

      // Enable once socket connection issue is fixed
      //
      // await t.step(`UNIX Socket`, async (t) => {
      //   await connectionTest(t)
      // });
    });
  }
});
