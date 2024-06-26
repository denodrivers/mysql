# @db/mysql

[![Build Status](https://github.com/denodrivers/mysql/actions/workflows/ci.yml/badge.svg)](https://github.com/denodrivers/mysql/actions/workflows/ci.yml)
[![JSR](https://jsr.io/badges/@db/mysql)](https://jsr.io/@db/mysql)
[![JSR Score](https://jsr.io/badges/@db/mysql/score)](https://jsr.io/@db/mysql)

MySQL and MariaDB database driver for Deno.

On this basis, there is also an ORM library:
[Deno Simple Orm](https://github.com/manyuanrong/dso)

欢迎国内的小伙伴加我专门建的 Deno QQ 交流群：698469316

## Installation

This package is published on [JSR](https://jsr.io/@db/mysql)

```
deno add @db/mysql
```

## Usage

See [Deno Standard Library Extended SQL](https://jsr.io/@stdext/sql) for general
API interfaces and examples

### Client

```ts
import { MysqlClient } from "jsr:@db/mysql@3.0.0";
await using client = new MysqlClient(
  "mysql://root:password@0.0.0.0:3306/dbname",
);
await client.connect();
await client.execute("CREATE TABLE test (testcol TEXT)");
await client.query("SELECT * FROM test");
```

### Client Pool

```ts
import { MysqlClientPool } from "jsr:@db/mysql@3.0.0";
await using clientPool = new MysqlClientPool(
  "mysql://root:password@0.0.0.0:3306/dbname",
  { maxSize: 3 },
);
await clientPool.connect();
const client = await clientPool.aquire();
await client.query("SELECT * FROM test");
clientPool.release();
```

### Queries

#### create database

```ts
await client.execute(`CREATE DATABASE IF NOT EXISTS enok`);
await client.execute(`USE enok`);
```

#### create table

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

#### insert

```ts
let result = await client.execute(`INSERT INTO users(name) values(?)`, [
  "manyuanrong",
]);
console.log(result);
// 1
```

#### update

```ts
let result = await client.execute(`update users set ?? = ?`, ["name", "MYR"]);
console.log(result);
// 1
```

#### delete

```ts
let result = await client.execute(`delete from users where ?? = ?`, ["id", 1]);
console.log(result);
// 1
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
// [{ id: 1, name: "enok" }]
```

### transaction

```ts
const users = await client.transaction(async (conn) => {
  await conn.execute(`insert into users(name) values(?)`, ["test"]);
  return await conn.query(`select ?? from ??`, ["name", "users"]);
});
console.log(users.length);
```

### TLS

TLS configuration:

- caCerts([]string): A list of root certificates (must be PEM format) that will
  be used in addition to the default root certificates to verify the peer's
  certificate.
- mode(string): The TLS mode to use. Valid values are "disabled",
  "verify_identity". Defaults to "disabled".

You usually need not specify the caCert, unless the certificate is not included
in the default root certificates.

```ts
const client = new MysqlClient("mysql://root:password@0.0.0.0:3306/dbname", {
  tls: {
    mode: TLSMode.VERIFY_IDENTITY,
    caCerts: [await Deno.readTextFile("capath")],
  },
});

await client.connect();
```

### close

If async dispose is not used, you have to manually close the connection at the
end of your script.

```ts
// Async dispose
await using client = new MysqlClient(
  "mysql://root:password@0.0.0.0:3306/dbname",
);
await client.connect();
// no need to close the client

// Normal creation of class
const client = new MysqlClient("mysql://root:password@0.0.0.0:3306/dbname");
await client.connect();
// manual closing of connection needed.
await client.close();
```

## Logging

Logging is set up using [std/log](https://jsr.io/@std/log)

To change logging, add this in the entrypoint of your script:

```ts
import { ConsoleHandler, setup } from "@std/log";
import { MODULE_NAME } from "jsr:@db/mysql@3.0.0";

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
```

## Test

To run the tests, Docker and Docker Compose is required.

Run using

```
deno task test
```

## Upgrade from v2 to v3

From version `3` onwards, this package will only be published to
[JSR](https://jsr.io/@db/mysql). Version `3` will also be adapted to use the
standard interfaces from [stdext/sql](https://jsr.io/@stdext/sql), thus this is
a breaking change where you will have to adjust your usage accordingly.

### Client

V2:

```ts
import { Client } from "https://deno.land/x/mysql/mod.ts";
const client = await new Client().connect({
  hostname: "127.0.0.1",
  username: "root",
  db: "dbname",
  password: "password",
});
```

V3:

```ts
import { MysqlClient } from "jsr:@db/mysql@3.0.0";
await using client = new MysqlClient(
  "mysql://root:password@0.0.0.0:3306/dbname",
);
await client.connect();
```

### ClientPool

V2:

```ts
import { Client } from "https://deno.land/x/mysql/mod.ts";
const client = await new Client().connect({
  hostname: "127.0.0.1",
  username: "root",
  db: "dbname",
  poolSize: 3, // connection limit
  password: "password",
});
await client.query("SELECT * FROM test");
```

V3:

```ts
import { MysqlClientPool } from "jsr:@db/mysql@3.0.0";
await using clientPool = new MysqlClientPool(
  "mysql://root:password@0.0.0.0:3306/dbname",
  { maxSize: 3 },
);
await clientPool.connect();
const client = await clientPool.aquire();
await client.query("SELECT * FROM test");
clientPool.release();
```

### Iterators

V2:

```ts
await client.useConnection(async (conn) => {
  // note the third parameter of execute() method.
  const { iterator: users } = await conn.execute(
    `select * from users`,
    /* params: */ [],
    /* iterator: */ true,
  );
  for await (const user of users) {
    console.log(user);
  }
});
```

V3:

```ts
for await (const user of client.queryMany("SELECT * FROM users")) {
  console.log(user);
}
```
