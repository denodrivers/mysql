import { resolve } from "@std/path";
import { ConsoleHandler, setup } from "@std/log";
import { MODULE_NAME } from "./meta.ts";

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

export const DIR_TMP_TEST = resolve(Deno.cwd(), "tmp_test");
console.log(DIR_TMP_TEST);

//socket "/var/run/mysqld/mysqld.sock";
export const URL_TEST_CONNECTION = Deno.env.get("DENO_MYSQL_CONNECTION_URL") ||
  "mysql://root@0.0.0.0:3306/testdb";
export const URL_TEST_CONNECTION_MARIADB =
  Deno.env.get("DENO_MARIADB_CONNECTION_URL") ||
  "mysql://root@0.0.0.0:3307/testdb";
