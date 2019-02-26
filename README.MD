## deno_mysql

MySQL database driver for Deno.

Still under development.

## TODO

- [x] connecting to database
- [x] basic login authentication
- [x] simple queries (no arguments)
- [x] parsing data types
- [ ] queries with parameters
- [ ] close connection
- [ ] connection pool
- [ ] test case

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

### query
```ts
const username = "manyuanrong";
const users = client.query(`select * from users where username="${username}"`);
console.log(users);
```
