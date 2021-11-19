import type { BufferReader } from '../../buffer.ts';
import { ProtocolError } from '../../constant/errors.ts';
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
  MYSQL_TYPE_VAR_STRING,
  MYSQL_TYPE_VARCHAR,
  MYSQL_TYPE_GEOMETRY,
  MYSQL_TYPE_YEAR,
} from '../../constant/mysql_types.ts';

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
export function parseRow(reader: BufferReader, fields: FieldInfo[]): any {
  const row: any = {};
  for (const field of fields) {
    const name = field.name;
    const val = reader.readLenCodeString();
    row[name] = val === null ? null : convertType(field, val);
  }
  return row;
}

export function parseBinaryRow(reader: BufferReader, fields: FieldInfo[]): any {
  const row: { [key: string]: unknown } = {};
  let nullBitmap: boolean[] = [];

  const nullBitmapBuffer = reader
    .skip(1)
    .readBuffer(Math.floor((fields.length + 9) / 8));

  for (const byte of nullBitmapBuffer) {
    let bits = byte.toString(2);
    if (bits.length < 8) {
      bits = '0'.repeat(8 - bits.length) + bits;
    }
    nullBitmap = [
      ...nullBitmap,
      ...bits
        .split('')
        .reverse()
        .map((bit) => bit === '1'),
    ];
  }
  nullBitmap = nullBitmap.slice(2, fields.length + 2);

  for (const [index, field] of fields.entries()) {
    const isNull = nullBitmap[index];
    let val: unknown;

    if (isNull) {
      val = null;
    } else {
      switch (field.fieldType) {
        case MYSQL_TYPE_LONGLONG:
          const _longView = new DataView(reader.readBuffer(8).buffer);
          const long = _longView.getBigInt64(0, true);
          if (
            long > Number.MAX_SAFE_INTEGER ||
            long < Number.MIN_SAFE_INTEGER
          ) {
            val = long;
          } else {
            val = Number(long);
          }
          break;
        case MYSQL_TYPE_LONG:
        case MYSQL_TYPE_INT24:
          val = reader.readUint32();
          break;
        case MYSQL_TYPE_SHORT:
        case MYSQL_TYPE_YEAR:
          val = reader.readUint16();
          break;
        case MYSQL_TYPE_TINY:
          val = reader.readUint8();
          break;
        case MYSQL_TYPE_DOUBLE:
          val = new DataView(reader.readBuffer(8).buffer).getFloat64(0, true);
          break;
        case MYSQL_TYPE_FLOAT:
          val = new DataView(reader.readBuffer(4).buffer).getFloat32(0, true);
          break;
        case MYSQL_TYPE_NEWDECIMAL:
        case MYSQL_TYPE_VAR_STRING:
        case MYSQL_TYPE_VARCHAR:
        case MYSQL_TYPE_STRING:
        case MYSQL_TYPE_GEOMETRY:
          val = reader.readLenCodeString();
          break;
        default:
          throw new ProtocolError(
            `Currently unsupported field type: ${JSON.stringify(field)},`
          );
      }
    }

    row[field.name] = val;
  }
  return row;
}

/** @ignore */
function convertType(field: FieldInfo, val: string): any {
  const { fieldType, fieldLen } = field;
  switch (fieldType) {
    case MYSQL_TYPE_DECIMAL:
    case MYSQL_TYPE_DOUBLE:
    case MYSQL_TYPE_FLOAT:
    case MYSQL_TYPE_DATETIME2:
      return parseFloat(val);
    case MYSQL_TYPE_NEWDECIMAL:
      return val; // #42 MySQL's decimal type cannot be accurately represented by the Number.
    case MYSQL_TYPE_TINY:
    case MYSQL_TYPE_SHORT:
    case MYSQL_TYPE_LONG:
    case MYSQL_TYPE_INT24:
      return parseInt(val);
    case MYSQL_TYPE_LONGLONG:
      if (
        Number(val) < Number.MIN_SAFE_INTEGER ||
        Number(val) > Number.MAX_SAFE_INTEGER
      ) {
        return BigInt(val);
      } else {
        return parseInt(val);
      }
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
