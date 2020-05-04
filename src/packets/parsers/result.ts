import { BufferReader } from "../../buffer.ts";
import {
  MYSQL_TYPE_DATE,
  MYSQL_TYPE_DATETIME,
  MYSQL_TYPE_DATETIME2,
  MYSQL_TYPE_DECIMAL,
  MYSQL_TYPE_DOUBLE,
  MYSQL_TYPE_FLOAT,
  MYSQL_TYPE_INT24,
  MYSQL_TYPE_LONG,
  MYSQL_TYPE_LONGLONG,
  MYSQL_TYPE_NEWDATE,
  MYSQL_TYPE_NEWDECIMAL,
  MYSQL_TYPE_SHORT,
  MYSQL_TYPE_STRING,
  MYSQL_TYPE_TIME,
  MYSQL_TYPE_TIME2,
  MYSQL_TYPE_TIMESTAMP,
  MYSQL_TYPE_TIMESTAMP2,
  MYSQL_TYPE_TINY,
  MYSQL_TYPE_VARCHAR,
  MYSQL_TYPE_VAR_STRING,
} from "../../constant/mysql_types.ts";

/** @ignore */
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

/** @ignore */
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

/** @ignore */
export function parseRow(reader: BufferReader, fileds: FieldInfo[]): any {
  const row: any = {};
  for (let i = 0; i < fileds.length; i++) {
    const name = fileds[i].name;
    const val = reader.readLenCodeString();
    row[name] = val === null ? null : convertType(fileds[i], val);
  }
  return row;
}

/** @ignore */
function convertType(field: FieldInfo, val: string): any {
  const { fieldType, fieldLen } = field;
  if (fieldType === MYSQL_TYPE_TINY && fieldLen === 1) {
    return !!parseInt(val);
  }
  switch (fieldType) {
    case MYSQL_TYPE_DECIMAL:
    case MYSQL_TYPE_DOUBLE:
    case MYSQL_TYPE_FLOAT:
    case MYSQL_TYPE_DATETIME2:
    case MYSQL_TYPE_NEWDECIMAL:
      return parseFloat(val);
    case MYSQL_TYPE_TINY:
    case MYSQL_TYPE_SHORT:
    case MYSQL_TYPE_LONG:
    case MYSQL_TYPE_LONGLONG:
    case MYSQL_TYPE_INT24:
      return parseInt(val);
    case MYSQL_TYPE_VARCHAR:
    case MYSQL_TYPE_VAR_STRING:
    case MYSQL_TYPE_STRING:
    case MYSQL_TYPE_TIME:
    case MYSQL_TYPE_TIME2:
      return val;
    case MYSQL_TYPE_DATE:
    case MYSQL_TYPE_TIMESTAMP:
    case MYSQL_TYPE_DATETIME:
    case MYSQL_TYPE_NEWDATE:
    case MYSQL_TYPE_TIMESTAMP2:
    case MYSQL_TYPE_DATETIME2:
      return new Date(val);
    default:
      return val;
  }
}
