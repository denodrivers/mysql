import { replaceParams } from "../../utils/query.ts";
import { BufferWriter } from "../../utils/buffer.ts";
import { encode } from "../../utils/encoding.ts";
import type { MysqlParameterType } from "../parsers/result.ts";

/** @ignore */
export function buildQuery(
  sql: string,
  params: MysqlParameterType[] = [],
): Uint8Array {
  const data = encode(replaceParams(sql, params));
  const writer = new BufferWriter(new Uint8Array(data.length + 1));
  writer.write(0x03);
  writer.writeBuffer(data);
  return writer.buffer;
}
