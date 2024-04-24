import { resolve } from "@std/path";
import { ConsoleHandler, setup } from "@std/log";
import { MODULE_NAME } from "./meta.ts";
import { parse } from "@std/yaml";
import type { BaseQueriableTestOptions } from "@halvardm/sqlx/testing";

type DockerCompose = {
  services: {
    [key: string]: {
      image: string;
      ports: string[];
      environment: Record<string, unknown>;
      volumes: string[];
    };
  };
};

type ServiceParsed = {
  name: string;
  port: string;
  database: string;
  // socket: string;
  url: string;
  // urlSocket: string;
};

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

const composeParsed = parse(
  Deno.readTextFileSync(resolve(Deno.cwd(), "compose.yml")),
  { "onWarning": console.warn },
) as DockerCompose;

export const services: ServiceParsed[] = Object.entries(composeParsed.services)
  .map(
    ([key, value]) => {
      const port = value.ports[0].split(":")[0];
      const database = Object.entries(value.environment).find(([e]) =>
        e.includes("DATABASE")
      )?.[1] as string;
      // const socket = resolve(value.volumes[0].split(":")[0])+"/mysqld.sock";
      const url = `mysql://root@0.0.0.0:${port}/${database}`;
      // const urlSocket = `${url}?socket=${socket}`;
      return {
        name: key,
        port,
        database,
        // socket,
        url,
        // urlSocket,
      };
    },
  );

export const URL_TEST_CONNECTION = services.find((s) => s.name === "mysql")
  ?.url as string;

export const QUERIES: BaseQueriableTestOptions["queries"] = {
  createTable: "CREATE TABLE IF NOT EXISTS sqlxtesttable (testcol TEXT)",
  dropTable: "DROP TABLE IF EXISTS sqlxtesttable",
  insertOneToTable: "INSERT INTO sqlxtesttable (testcol) VALUES (?)",
  insertManyToTable: "INSERT INTO sqlxtesttable (testcol) VALUES (?),(?),(?)",
  selectOneFromTable: "SELECT * FROM sqlxtesttable WHERE testcol = ? LIMIT 1",
  selectByMatchFromTable: "SELECT * FROM sqlxtesttable WHERE testcol = ?",
  selectManyFromTable: "SELECT * FROM sqlxtesttable",
  select1AsString: "SELECT '1' as result",
  select1Plus1AsNumber: "SELECT 1+1 as result",
  deleteByMatchFromTable: "DELETE FROM sqlxtesttable WHERE testcol = ?",
  deleteAllFromTable: "DELETE FROM sqlxtesttable",
};
