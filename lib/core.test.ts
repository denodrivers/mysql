import {
  testSqlPreparedStatement,
  testSqlTransaction,
} from "@stdext/sql/testing";
import { MysqlConnection } from "./connection.ts";
import { MysqlPreparedStatement, MysqlTransaction } from "./core.ts";
import { services } from "./utils/testing.ts";

Deno.test(`sql/type test`, async (t) => {
  for (const service of services) {
    const connectionUrl = service.url;
    const options: MysqlTransaction["options"] = {};

    await t.step(`Testing ${service.name}`, async (t) => {
      const sql = "SELECT 1 as one;";

      await using connection = new MysqlConnection(connectionUrl, options);
      await connection.connect();
      const preparedStatement = new MysqlPreparedStatement(
        connection,
        sql,
        options,
      );
      const transaction = new MysqlTransaction(connection, options);

      const expects = {
        connectionUrl,
        options,
        clientPoolOptions: options,
        sql,
      };

      await t.step(`sql/PreparedStatement`, () => {
        testSqlPreparedStatement(preparedStatement, expects);
      });

      await t.step(`sql/SqlTransaction`, () => {
        testSqlTransaction(transaction, expects);
      });
    });
  }
});
