import { ServerCapabilities } from '../../constant/capabilities.ts';
import { TypedReader } from '../typedBuffer.ts';

export class ErrorBody extends Error {
  code: number;
  sqlStateMarker?: number;
  sqlState?: number;
  message: string;

  constructor(body: Uint8Array, capabilities: number) {
    const reader = new TypedReader(body);
    const code = reader.skip(1).readUint16();
    let sqlStateMarker, sqlState;

    if (capabilities & ServerCapabilities.CLIENT_PROTOCOL_41) {
      sqlStateMarker = reader.readUint8();
      sqlState = reader.readUints(5);
    }

    const message = reader.readNullTerminatedString();

    super(message);

    this.code = code;
    this.sqlState = sqlState;
    this.sqlStateMarker = sqlStateMarker;
    this.message = message;
  }
}
