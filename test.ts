import {
  assertEquals,
  assertThrowsAsync,
} from "./deps.ts";
import { WriteError } from "./src/constant/errors.ts";
import { createTestDB, testWithClient } from "./test.util.ts";

testWithClient(async function testCreateDb(client) {
  await client.query(`CREATE DATABASE IF NOT EXISTS enok`);
});

testWithClient(async function testCreateTable(client) {
  await client.query(`DROP TABLE IF EXISTS users`);
  await client.query(`
        CREATE TABLE users (
            id int(11) NOT NULL AUTO_INCREMENT,
            name varchar(100) NOT NULL,
            is_top tinyint(1) default 0,
            created_at timestamp not null default current_timestamp,
            PRIMARY KEY (id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
});

testWithClient(async function testInsert(client) {
  let result = await client.execute(`INSERT INTO users(name) values(?)`, [
    "manyuanrong",
  ]);
  assertEquals(result, { affectedRows: 1, lastInsertId: 1 });
  result = await client.execute(`INSERT INTO users ?? values ?`, [
    ["id", "name"],
    [2, "MySQL"],
  ]);
  assertEquals(result, { affectedRows: 1, lastInsertId: 2 });
});

testWithClient(async function testUpdate(client) {
  let result = await client.execute(
    `update users set ?? = ?, ?? = ? WHERE id = ?`,
    ["name", "MYR🦕", "created_at", new Date(), 1],
  );
  assertEquals(result, { affectedRows: 1, lastInsertId: 0 });
});

testWithClient(async function testQuery(client) {
  let result = await client.query(
    "select ??,`is_top`,`name` from ?? where id = ?",
    ["id", "users", 1],
  );
  assertEquals(result, [{ id: 1, name: "MYR🦕", is_top: false }]);
});

testWithClient(async function testQueryErrorOccurred(client) {
  assertEquals(client.pool, {
    size: 0,
    maxSize: client.config.poolSize,
    available: 0,
  });
  await assertThrowsAsync(
    () => client.query("select unknownfield from `users`"),
    Error,
  );
  await client.query("select 1");
  assertEquals(client.pool, {
    size: 1,
    maxSize: client.config.poolSize,
    available: 1,
  });
});

testWithClient(async function testQueryList(client) {
  const sql = "select ??,?? from ??";
  let result = await client.query(sql, ["id", "name", "users"]);
  assertEquals(result, [
    { id: 1, name: "MYR🦕" },
    { id: 2, name: "MySQL" },
  ]);
});

testWithClient(async function testQueryTime(client) {
  const sql = `SELECT CAST("09:04:10" AS time) as time`;
  let result = await client.query(sql);
  assertEquals(result, [{ time: "09:04:10" }]);
});

testWithClient(async function testDelete(client) {
  let result = await client.execute(`delete from users where ?? = ?`, [
    "id",
    1,
  ]);
  assertEquals(result, { affectedRows: 1, lastInsertId: 0 });
});

testWithClient(async function testPool(client) {
  assertEquals(client.pool, {
    maxSize: client.config.poolSize,
    available: 0,
    size: 0,
  });
  const expect = new Array(10).fill([{ "1": 1 }]);
  const result = await Promise.all(expect.map(() => client.query(`select 1`)));

  assertEquals(client.pool, {
    maxSize: client.config.poolSize,
    available: 3,
    size: 3,
  });
  assertEquals(result, expect);
});

testWithClient(async function testQueryOnClosed(client) {
  for (const i of [0, 0, 0]) {
    await assertThrowsAsync(async () => {
      await client.transaction(async (conn) => {
        conn.close();
        await conn.query("SELECT 1");
      });
    }, WriteError);
  }
  assertEquals(client.pool?.size, 0);
  await client.query("select 1");
});

testWithClient(async function testTransactionSuccess(client) {
  const success = await client.transaction(async (connection) => {
    await connection.execute("insert into users(name) values(?)", [
      "transaction1",
    ]);
    await connection.execute("delete from users where id = ?", [2]);
    return true;
  });
  assertEquals(true, success);
  const result = await client.query("select name,id from users");
  assertEquals([{ name: "transaction1", id: 3 }], result);
});

testWithClient(async function testTransactionRollback(client) {
  let success;
  await assertThrowsAsync(async () => {
    success = await client.transaction(async (connection) => {
      // Insert an existing id
      await connection.execute("insert into users(name,id) values(?,?)", [
        "transaction2",
        3,
      ]);
      return true;
    });
  });
  assertEquals(undefined, success);
  const result = await client.query("select name from users");
  assertEquals([{ name: "transaction1" }], result);
});

await createTestDB();
