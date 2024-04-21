import type { BufferReader } from "../../utils/buffer.ts";
import { MysqlDataType } from "../../constant/mysql_types.ts";
import type { ArrayRow, Row, SqlxQueryOptions } from "@halvardm/sqlx";

export type MysqlParameterType =
  | null
  | string
  | number
  | boolean
  | bigint
  | Date
  // deno-lint-ignore no-explicit-any
  | Array<any>
  | object
  | undefined;

/**
 * Field information
 */
export interface FieldInfo {
  catalog: string;
  schema: string;
  table: string;
  originTable: string;
  name: string;
  originName: string;
  encoding: number;
  fieldLen: number;
  fieldType: number;
  fieldFlag: number;
  decimals: number;
  defaultVal: string;
}

export type ConvertTypeOptions = Pick<SqlxQueryOptions, "transformType">;

/**
 * Parses the field
 */
export function parseField(reader: BufferReader): FieldInfo {
  const catalog = reader.readLenCodeString()!;
  const schema = reader.readLenCodeString()!;
  const table = reader.readLenCodeString()!;
  const originTable = reader.readLenCodeString()!;
  const name = reader.readLenCodeString()!;
  const originName = reader.readLenCodeString()!;
  reader.skip(1);
  const encoding = reader.readUint16()!;
  const fieldLen = reader.readUint32()!;
  const fieldType = reader.readUint8()!;
  const fieldFlag = reader.readUint16()!;
  const decimals = reader.readUint8()!;
  reader.skip(1);
  const defaultVal = reader.readLenCodeString()!;
  return {
    catalog,
    schema,
    table,
    originName,
    fieldFlag,
    originTable,
    fieldLen,
    name,
    fieldType,
    encoding,
    decimals,
    defaultVal,
  };
}

/**
 * Parse the row as an array
 */
export function parseRowArray(
  reader: BufferReader,
  fields: FieldInfo[],
  options?: ConvertTypeOptions,
): ArrayRow<MysqlParameterType> {
  const row: MysqlParameterType[] = [];
  for (const field of fields) {
    const val = reader.readLenCodeString();
    const parsedVal = val === null ? null : convertType(field, val, options);
    row.push(parsedVal);
  }
  return row;
}

/**
 * Parses the row as an object
 */
export function parseRowObject(
  reader: BufferReader,
  fields: FieldInfo[],
): Row<MysqlParameterType> {
  const rowArray = parseRowArray(reader, fields);
  return getRowObject(fields, rowArray);
}

export function getRowObject(
  fields: FieldInfo[],
  row: ArrayRow<MysqlParameterType>,
): Row<MysqlParameterType> {
  const obj: Row<MysqlParameterType> = {};
  for (const [i, field] of fields.entries()) {
    const name = field.name;
    obj[name] = row[i];
  }
  return obj;
}

/**
 * Converts the value to the correct type
 */
function convertType(
  field: FieldInfo,
  val: string,
  options?: ConvertTypeOptions,
): MysqlParameterType {
  if (options?.transformType) {
    // deno-lint-ignore no-explicit-any
    return options.transformType(val) as any;
  }
  const { fieldType } = field;
  switch (fieldType) {
    case MysqlDataType.Decimal:
    case MysqlDataType.Double:
    case MysqlDataType.Float:
    case MysqlDataType.DateTime2:
      return parseFloat(val);
    case MysqlDataType.NewDecimal:
      return val; // #42 MySQL's decimal type cannot be accurately represented by the Number.
    case MysqlDataType.Tiny:
    case MysqlDataType.Short:
    case MysqlDataType.Long:
    case MysqlDataType.Int24:
      return parseInt(val);
    case MysqlDataType.LongLong:
      if (
        Number(val) < Number.MIN_SAFE_INTEGER ||
        Number(val) > Number.MAX_SAFE_INTEGER
      ) {
        return BigInt(val);
      } else {
        return parseInt(val);
      }
    case MysqlDataType.VarChar:
    case MysqlDataType.VarString:
    case MysqlDataType.String:
    case MysqlDataType.Time:
    case MysqlDataType.Time2:
      return val;
    case MysqlDataType.Date:
    case MysqlDataType.Timestamp:
    case MysqlDataType.DateTime:
    case MysqlDataType.NewDate:
    case MysqlDataType.Timestamp2:
      return new Date(val);
    default:
      return val;
  }
}
