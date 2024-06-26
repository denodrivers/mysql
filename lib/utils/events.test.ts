import { testSqlEventTarget } from "@stdext/sql/testing";
import {
  MysqlClientEventTarget,
  MysqlPoolClientEventTarget,
} from "./events.ts";

Deno.test(`events`, () => {
  testSqlEventTarget(new MysqlClientEventTarget());
  testSqlEventTarget(new MysqlPoolClientEventTarget());
});
