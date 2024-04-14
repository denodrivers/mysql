import { resolve } from "@std/path";

export const DIR_TMP_TEST = resolve("tmp_test");

//socket "/var/run/mysqld/mysqld.sock";
export const URL_TEST_CONNECTION = Deno.env.get("DENO_MYSQL_CONNECTION_URL") ||
  "mysql://root@0.0.0.0:3306/testdb";
