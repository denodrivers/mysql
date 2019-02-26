## deno_mysql

MySQL database driver for Deno.

Still under development.

## TODO

- [x] Connecting to database
- [x] Basic login authentication
- [x] Simple queries (no arguments)
- [x] Parsing data types
- [ ] Queries with parameters
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

### query
```ts
const username = "manyuanrong";
const users = client.query(`select * from users where username="${username}"`);
console.log(users);
```
