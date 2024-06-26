import { MysqlClientPool } from "./pool.ts";
import { services, testTransactionable } from "./utils/testing.ts";
import {
  testClientPoolConnection,
  testSqlClientPool,
} from "@stdext/sql/testing";

Deno.test("Pool Test", async (t) => {
  for (const service of services) {
    await t.step(`Testing ${service.name}`, async (t) => {
      testSqlClientPool(new MysqlClientPool(service.url), {
        connectionUrl: service.url,
        options: {},
      });

      async function connectionTest(t: Deno.TestContext, url: string) {
        await testClientPoolConnection(t, MysqlClientPool, [url, {}]);
        await using clientPool = new MysqlClientPool(url);
        await clientPool.connect();
        await using client = await clientPool.acquire();
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
        await connectionTest(t, service.url);
      });

      // Enable once socket connection issue is fixed
      //
      // await t.step(`UNIX Socket`, async (t) => {
      //   await connectionTest(t,service.urlSocket)
      // });
    });
  }
});
