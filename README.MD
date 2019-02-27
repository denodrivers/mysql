## deno_mysql

MySQL database driver for Deno.

Still under development.

## TODO

- [x] Connecting to database
- [x] Basic login authentication
- [x] Simple queries (no arguments)
- [x] Parsing data types
- [x] Queries with parameters
- [ ] Close connection
- [ ] Connection pool
- [ ] Transaction
- [ ] Test case

## API

### connet
```ts
import { Client } from "https://raw.githubusercontent.com/manyuanrong/deno_mysql/master/mod.ts";
const client = await new Client().connect({
    hostname: "127.0.0.1",
    username: "root",
    db: "dbname",
    password: "password"
});
```

### create database
```ts
await client.query(`CREATE DATABASE IF NOT EXISTS enok`);
await client.query(`USE enok`);
```

### create table
```ts
await client.query(`DROP TABLE IF EXISTS users`);
await client.query(`
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
let result = await client.execute(`INSERT INTO users(name) values(?)`, ["manyuanrong"]);
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
const users = await client.query(`select * from users where username="${username}"`);
const queryWithParams = await client.query("select ??,name from ?? where id = ?", ["id", "users", 1]);
console.log(users, queryWithParams);
```