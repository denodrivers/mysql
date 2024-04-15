import type { MysqlParameterType } from "../packets/parsers/result.ts";

/**
 * Replaces parameters in a SQL query with the given values.
 *
 * Taken from https://github.com/manyuanrong/sql-builder/blob/master/util.ts
 */
export function replaceParams(
  sql: string,
  params: MysqlParameterType[],
): string {
  if (!params) return sql;
  let paramIndex = 0;
  sql = sql.replace(
    /('[^'\\]*(?:\\.[^'\\]*)*')|("[^"\\]*(?:\\.[^"\\]*)*")|(\?\?)|(\?)/g,
    (str) => {
      if (paramIndex >= params.length) return str;
      // ignore
      if (/".*"/g.test(str) || /'.*'/g.test(str)) {
        return str;
      }
      // identifier
      if (str === "??") {
        const val = params[paramIndex++];
        if (val instanceof Array) {
          return `(${
            val.map((item) => replaceParams("??", [item])).join(",")
          })`;
        } else if (val === "*") {
          return val;
        } else if (typeof val === "string" && val.includes(".")) {
          // a.b => `a`.`b`
          const _arr = val.split(".");
          return replaceParams(_arr.map(() => "??").join("."), _arr);
        } else if (
          typeof val === "string" &&
          (val.includes(" as ") || val.includes(" AS "))
        ) {
          // a as b => `a` AS `b`
          const newVal = val.replace(" as ", " AS ");
          const _arr = newVal.split(" AS ");
          return replaceParams(_arr.map(() => "??").join(" AS "), _arr);
        } else {
          return ["`", val, "`"].join("");
        }
      }
      // value
      const val = params[paramIndex++];
      if (val === null) return "NULL";
      switch (typeof val) {
        // deno-lint-ignore no-fallthrough
        case "object":
          if (val instanceof Date) return `"${formatDate(val)}"`;
          if ((val as unknown) instanceof Array) {
            return `(${
              (val as Array<string>).map((item) => replaceParams("?", [item]))
                .join(",")
            })`;
          }
        case "string":
          return `"${escapeString(val)}"`;
        case "undefined":
          return "NULL";
        case "number":
        case "boolean":
        default:
          return val.toString();
      }
    },
  );
  return sql;
}

/**
 * Formats date to a 'YYYY-MM-DD HH:MM:SS.SSS' string.
 */
function formatDate(date: Date) {
  date.toISOString();
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const days = date
    .getDate()
    .toString()
    .padStart(2, "0");
  const hours = date
    .getHours()
    .toString()
    .padStart(2, "0");
  const minutes = date
    .getMinutes()
    .toString()
    .padStart(2, "0");
  const seconds = date
    .getSeconds()
    .toString()
    .padStart(2, "0");
  // Date does not support microseconds precision, so we only keep the milliseconds part.
  const milliseconds = date
    .getMilliseconds()
    .toString()
    .padStart(3, "0");
  return `${year}-${month}-${days} ${hours}:${minutes}:${seconds}.${milliseconds}`;
}

/**
 * Escapes a string for use in a SQL query.
 */
function escapeString(str: string) {
  return str.replaceAll("\\", "\\\\").replaceAll('"', '\\"');
}
