import { Client } from "./mod.ts";
import { test, runTests, assert } from "https://deno.land/x/testing/mod.ts";
import "./tests/query.ts";

let client: Client;

test(async function testCreateDb() {
    await client.query(`CREATE DATABASE IF NOT EXISTS enok`);
    await client.query(`USE enok`);
});

test(async function testCreateTable() {
    await client.query(`DROP TABLE IF EXISTS users`);
    await client.query(`
        CREATE TABLE users (
            id int(11) NOT NULL AUTO_INCREMENT,
            name varchar(100) NOT NULL,
            created_at timestamp not null default current_timestamp,
            PRIMARY KEY (id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8;
    `);
});

test(async function testInsert() {
    let result = await client.execute(`INSERT INTO users(name) values(?)`, ["manyuanrong"]);
    assert.equal(result, { affectedRows: 1, lastInsertId: 1 });
});

test(async function testUpdate() {
    let result = await client.execute(`update users set ?? = ?`, ["name", "MYR"]);
    assert.equal(result, { affectedRows: 1, lastInsertId: 0 });
});

test(async function testQuery() {
    let result = await client.query("select ??,name from ?? where id = ?", ["id", "users", 1]);
    assert.equal(result, [{ id: 1, name: "MYR" }]);
});

test(async function testDelete() {
    let result = await client.execute(`delete from users where ?? = ?`, ["id", 1]);
    assert.equal(result, { affectedRows: 1, lastInsertId: 0 });
});

async function main() {
    client = await new Client().connect({
        debug: false,
        hostname: "127.0.0.1",
        username: "root",
        db: "",
        password: ""
    });
    runTests();
}

main();