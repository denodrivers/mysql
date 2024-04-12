import { green } from "@std/fmt/colors";
import meta from "../deno.json" with { type: "json" };

export const MODULE_NAME = meta.name;
export const VERSION = meta.version;

export function xor(a: Uint8Array, b: Uint8Array): Uint8Array {
  return a.map((byte, index) => {
    return byte ^ b[index];
  });
}

/**
 * Formats a byte array into a human-readable hexdump.
 *
 * Taken from https://github.com/manyuanrong/bytes_formater/blob/master/format.ts
 */
export function byteFormat(data: ArrayBufferView) {
  const bytes = new Uint8Array(data.buffer);
  let out = "         +-------------------------------------------------+\n";
  out += `         |${
    green("  0  1  2  3  4  5  6  7  8  9  a  b  c  d  e  f ")
  }|\n`;
  out +=
    "+--------+-------------------------------------------------+----------------+\n";

  const lineCount = Math.ceil(bytes.length / 16);

  for (let line = 0; line < lineCount; line++) {
    const start = line * 16;
    const addr = start.toString(16).padStart(8, "0");
    const lineBytes = bytes.slice(start, start + 16);

    out += `|${green(addr)}| `;

    lineBytes.forEach(
      (byte) => (out += byte.toString(16).padStart(2, "0") + " "),
    );

    if (lineBytes.length < 16) {
      out += "   ".repeat(16 - lineBytes.length);
    }

    out += "|";

    lineBytes.forEach(function (byte) {
      return (out += byte > 31 && byte < 127
        ? green(String.fromCharCode(byte))
        : ".");
    });

    if (lineBytes.length < 16) {
      out += " ".repeat(16 - lineBytes.length);
    }

    out += "|\n";
  }
  out +=
    "+--------+-------------------------------------------------+----------------+";
  return out;
}

/**
 * Replaces parameters in a SQL query with the given values.
 *
 * Taken from https://github.com/manyuanrong/sql-builder/blob/master/util.ts
 */
export function replaceParams(sql: string, params: any | any[]): string {
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
          if (val instanceof Array) {
            return `(${
              val.map((item) => replaceParams("?", [item])).join(",")
            })`;
          }
        case "string":
          return `"${escapeString(val)}"`;
        case "undefined":
          return "NULL";
        case "number":
        case "boolean":
        default:
          return val;
      }
    },
  );
  return sql;
}

/**
 * Formats date to a 'YYYY-MM-DD HH:MM:SS.SSS' string.
 */
function formatDate(date: Date) {
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
