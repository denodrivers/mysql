import { BufferWriter, encode } from '../../buffer.ts';
import { PreparedStatement } from '../../connection.ts';
import { ProtocolError } from '../../constant/errors.ts';
import {
  MYSQL_TYPE_DATE,
  MYSQL_TYPE_DECIMAL,
  MYSQL_TYPE_DOUBLE,
  MYSQL_TYPE_ENUM,
  MYSQL_TYPE_FLOAT,
  MYSQL_TYPE_INT24,
  MYSQL_TYPE_LONGLONG,
  MYSQL_TYPE_NEWDECIMAL,
  MYSQL_TYPE_SHORT,
  MYSQL_TYPE_STRING,
  MYSQL_TYPE_TIME,
  MYSQL_TYPE_TINY,
  MYSQL_TYPE_VARCHAR,
  MYSQL_TYPE_VAR_STRING,
  MYSQL_TYPE_YEAR,
} from '../../constant/mysql_types.ts';

export function buildStmtPreparedPacket(sql: string): Uint8Array {
  const data = encode(sql);
  const writer = new BufferWriter(new Uint8Array(data.length + 1));
  writer.write(0x16);
  writer.writeBuffer(data);
  return writer.buffer;
}

export function buildStmtExecutePacket(
  statement: PreparedStatement,
  params?: any[]
): Uint8Array | Uint8Array[] {
  const header = new BufferWriter(new Uint8Array(10));
  header.write(0x17);
  header.writeUint32(statement.statementId);
  header.write(0); // Flags
  header.writeUint32(1); // Iteration count

  if (!params?.length) {
    return header.buffer;
  } else {
    if (params.length !== statement.params.length) {
      throw new ProtocolError('Params length mismatch');
    }

    const nullBitmapLen = Math.floor((statement.numParams + 7) / 8);
    let nullBitmap = 0;
    params.forEach((param, index) => {
      if (param === null) {
        console.log('dddddddd');
        nullBitmap |= 1 << (statement.numParams + 7 - index);
      }
    });

    const nullBitmapBuffer = new BufferWriter(new Uint8Array(nullBitmapLen));
    nullBitmapBuffer.writeUints(nullBitmap, nullBitmapLen);
    console.log(nullBitmapBuffer.buffer);

    const valuesBuffer: Uint8Array[] = [];

    params.forEach((param, index) => {
      const { fieldType } = statement.params[index];
      let valueWriter;
      switch (fieldType) {
        case MYSQL_TYPE_VARCHAR:
        case MYSQL_TYPE_STRING:
        case MYSQL_TYPE_VAR_STRING:
        case MYSQL_TYPE_NEWDECIMAL:
        case MYSQL_TYPE_DECIMAL:
          valueWriter = new DataView(encode(`${param}\0`).buffer);
          break;

        case MYSQL_TYPE_LONGLONG:
          valueWriter = new DataView(new ArrayBuffer(8));
          valueWriter.setBigUint64(0, param, true);
          break;

        case MYSQL_TYPE_ENUM:
        case MYSQL_TYPE_INT24:
          valueWriter = new DataView(new ArrayBuffer(4));
          valueWriter.setUint32(0, param, true);
          break;

        case MYSQL_TYPE_SHORT:
        case MYSQL_TYPE_YEAR:
          valueWriter = new DataView(new ArrayBuffer(2));
          valueWriter.setUint16(0, param, true);
          break;

        case MYSQL_TYPE_TINY:
          valueWriter = new DataView(new ArrayBuffer(1));
          valueWriter.setUint8(0, param);
          break;

        case MYSQL_TYPE_DOUBLE:
          valueWriter = new DataView(new ArrayBuffer(8));
          valueWriter.setFloat64(0, param, true);
          break;

        case MYSQL_TYPE_FLOAT:
          valueWriter = new DataView(new ArrayBuffer(4));
          valueWriter.setFloat32(0, param, true);
          break;

        case MYSQL_TYPE_DATE:
          const _date = param as Date;
          valueWriter = new DataView(new ArrayBuffer(12));
          valueWriter.setUint8(0, 11);
          valueWriter.setUint16(1, _date.getFullYear(), true);
          valueWriter.setUint8(3, _date.getMonth());
          valueWriter.setUint8(4, _date.getDate());
          valueWriter.setUint8(5, _date.getHours());
          valueWriter.setUint8(6, _date.getMinutes());
          valueWriter.setUint8(7, _date.getSeconds());
          valueWriter.setUint32(8, _date.getMilliseconds());
          break;

        case MYSQL_TYPE_TIME:
          const _time = param as number;
          valueWriter = new DataView(new ArrayBuffer(13));
          const millis = _time % 1000;
          const seconds = Math.floor(_time / 1000) % 60;
          const minutes = Math.floor(_time / 60000) % 60;
          const hours = Math.floor(_time / 3600000) % 24;
          const days = Math.floor(_time / 86400000);

          valueWriter.setUint8(0, 12);
          valueWriter.setUint8(1, param >= 0 ? 0 : 1);
          valueWriter.setUint32(2, days, true);
          valueWriter.setUint8(8, hours);
          valueWriter.setUint8(9, seconds);
          valueWriter.setUint8(10, minutes);
          valueWriter.setUint8(11, millis);
          break;
      }
      if (valueWriter) valuesBuffer.push(new Uint8Array(valueWriter.buffer));
    });

    return [header.buffer, nullBitmapBuffer.buffer, ...valuesBuffer];
  }
}
