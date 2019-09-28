# deno_mysql

[![Build Status](https://www.travis-ci.org/manyuanrong/deno_mysql.svg?branch=master)](https://www.travis-ci.org/manyuanrong/deno_mysql)
![GitHub](https://img.shields.io/github/license/manyuanrong/deno_mysql.svg)
![GitHub release](https://img.shields.io/github/release/manyuanrong/deno_mysql.svg)
![(Deno)](https://img.shields.io/badge/deno-0.19.0-green.svg)

MySQL database driver for Deno.

On this basis, there is also an ORM library: [Deno Simple Orm](https://github.com/manyuanrong/dso)

欢迎国内的小伙伴加我专门建的 Deno QQ 交流群：698469316

## TODO

- [x] Connecting to database
  - [x] Retring
  - [x] Timeout
- [x] Basic login authentication
- [x] Simple queries (no arguments)
- [x] Parsing data types
- [x] Queries with parameters
- [x] Close connection
- [x] Connection pool
- [x] Transaction
- [x] Test case

## API

### connect

```ts
import { Client } from "https://deno.land/x/mysql/mod.ts";
const client = await new Client().connect({
  hostname: "127.0.0.1",
  username: "root",
  db: "dbname",
  password: "password"
});
```

### connect pool

Create client with connection pool.

pool size is auto increment from 0 to `pool`

```ts
import { Client } from "https://deno.land/x/mysql/mod.ts";
const client = await new Client().connect({
  hostname: "127.0.0.1",
  username: "root",
  db: "dbname",
  pool: 3, // pool size
  password: "password"
});
```

### create database

```ts
await client.execute(`CREATE DATABASE IF NOT EXISTS enok`);
await client.execute(`USE enok`);
```

### create table

```ts
await client.execute(`DROP TABLE IF EXISTS users`);
await client.execute(`
    CREATE TABLE users (
        id int(11) NOT NULL AUTO_INCREMENT,
        name varchar(100) NOT NULL,
        created_at timestamp not null default current_timestamp,
        PRIMARY KEY (id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8;
`);
```

### insert

```ts
let result = await client.execute(`INSERT INTO users(name) values(?)`, [
  "manyuanrong"
]);
console.log(result);
// { affectedRows: 1, lastInsertId: 1 }
```

### update

```ts
let result = await client.execute(`update users set ?? = ?`, ["name", "MYR"]);
console.log(result);
// { affectedRows: 1, lastInsertId: 0 }
```

### delete

```ts
let result = await client.execute(`delete from users where ?? = ?`, ["id", 1]);
console.log(result);
// { affectedRows: 1, lastInsertId: 0 }
```

### query

```ts
const username = "manyuanrong";
const users = await client.query(
  `select * from users where username="${username}"`
);
const queryWithParams = await client.query(
  "select ??,name from ?? where id = ?",
  ["id", "users", 1]
);
console.log(users, queryWithParams);
```

### transaction

```ts
const users = await client.transcation(async conn => {
  await conn.excute(`insert into users(name) values(?)`, ["test"]);
  return await conn.query(`select ?? from ??`, ["name", "users"]);
});
console.log(users.length);
```

### close

```ts
await client.close();
```
