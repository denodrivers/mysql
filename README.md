# deno_mysql

[![Build Status](https://github.com/manyuanrong/deno_mysql/workflows/ci/badge.svg?branch=master)](https://github.com/manyuanrong/deno_mysql/actions)
![GitHub](https://img.shields.io/github/license/manyuanrong/deno_mysql.svg)
![GitHub release](https://img.shields.io/github/release/manyuanrong/deno_mysql.svg)
![(Deno)](https://img.shields.io/badge/deno-1.0.0-green.svg)

MySQL and MariaDB database driver for Deno.

On this basis, there is also an ORM library:
[Deno Simple Orm](https://github.com/manyuanrong/dso)

欢迎国内的小伙伴加我专门建的 Deno QQ 交流群：698469316

## API

### connect

```ts
import { Client } from "https://deno.land/x/mysql/mod.ts";
const client = await new Client().connect({
  hostname: "127.0.0.1",
  username: "root",
  db: "dbname",
  password: "password",
});
```

### connect pool

Create client with connection pool.

pool size is auto increment from 0 to `poolSize`

```ts
import { Client } from "https://deno.land/x/mysql/mod.ts";
const client = await new Client().connect({
  hostname: "127.0.0.1",
  username: "root",
  db: "dbname",
  poolSize: 3, // connection limit
  password: "password",
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
  "manyuanrong",
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
const users = await client.query(`select * from users`);
const queryWithParams = await client.query(
  "select ??,name from ?? where id = ?",
  ["id", "users", 1],
);
console.log(users, queryWithParams);
```

### execute

There are two ways to execute an SQL statement.

First and default one will return you an `rows` key containing an array of rows:

```ts
const { rows: users } = await client.execute(`select * from users`);
console.log(users);
```

The second one will return you an `iterator` key containing an
`[Symbol.asyncIterator]` property:

```ts
await client.useConnection(async (conn) => {
  // note the third parameter of execute() method.
  const { iterator: users } = await conn.execute(
    `select * from users`,
    /* params: */ [],
    /* iterator: */ false,
  );
  for await (const user of users) {
    console.log(user);
  }
});
```

The second method is recommended only for SELECT queries that might contain many
results (e.g. 100k rows).

### transaction

```ts
const users = await client.transaction(async (conn) => {
  await conn.execute(`insert into users(name) values(?)`, ["test"]);
  return await conn.query(`select ?? from ??`, ["name", "users"]);
});
console.log(users.length);
```

### close

```ts
await client.close();
```

## Logging

The driver logs to the console by default.

To disable logging:

```ts
import { configLogger } from "https://deno.land/x/mysql/mod.ts";
await configLogger({ enable: false });
```

## Test

The tests require a database to run against.

```bash
docker container run --rm -d -p 3306:3306 -e MYSQL_ALLOW_EMPTY_PASSWORD=true docker.io/mariadb:latest
deno test --allow-env --allow-net=127.0.0.1:3306 ./test.ts
```

Use different docker images to test against different versions of MySQL and
MariaDB. Please see [ci.yml](./.github/workflows/ci.yml) for examples.
