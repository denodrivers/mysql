import { encode } from "../../../deps.ts";
import { BufferWriter } from "../../buffer.ts";

/** @ignore */
export function buildQuery(sql: string, params: any[] = []): Uint8Array {
  const data = encode(replaceParams(sql, params));
  const writer = new BufferWriter(new Uint8Array(data.length + 1));
  writer.write(0x03);
  writer.writeBuffer(data);
  return writer.buffer;
}

export function replaceParams(sql: string, params: any[]): string {
  let paramIndex = 0;
  sql = sql.replace(/(\?\?)|(\?)/g, str => {
    // identifier
    if (str === "??") {
      const val = params[paramIndex++];
      if (val instanceof Array) {
        return `(${val.map(item => replaceParams("??", [item])).join(",")})`;
      } else {
        return ["`", val, "`"].join("");
      }
    }
    // value
    const val = params[paramIndex++];
    switch (typeof val) {
      case "object":
        if (val instanceof Date) return formatDate(val);
        if (val instanceof Array) {
          return `(${val.map(item => replaceParams("?", [item])).join(",")})`;
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
  });
  return sql;
}

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
  return `${year}-${month}-${days} ${hours}:${minutes}:${seconds}`;
}

function escapeString(str: string) {
  return str.replace(/"/g, '\\"');
}
