import { ServerCapabilities } from '../../constant/capabilities.ts';
import { TypedReader, TypedWriter } from '../typedBuffer.ts';

export class HandshakeBody {
  protocolVersion: number;
  serverVersion: string;
  threadId: number;
  serverCapabilities: number;

  characterSet?: number;
  seed?: Uint8Array;
  statusFlags?: number;
  authPluginName?: string;

  constructor(body: Uint8Array) {
    const reader = new TypedReader(body);

    this.protocolVersion = reader.readUint8();
    this.serverVersion = reader.readNullTerminatedString();
    this.threadId = reader.readUint32();

    const seedWriter = new TypedWriter(20);
    seedWriter.writeBuffer(reader.readBuffer(8));

    reader.skip(1);
    this.serverCapabilities = reader.readUint16();

    let authPluginDataLength: number = 0;

    if (!reader.finished) {
      this.characterSet = reader.readUint8();
      this.statusFlags = reader.readUint16();
      this.serverCapabilities |= reader.readUint16() << 16;

      if (this.serverCapabilities & ServerCapabilities.CLIENT_PLUGIN_AUTH) {
        authPluginDataLength = reader.readUint8();
      } else {
        reader.skip(1);
      }
      reader.skip(10);

      if (
        this.serverCapabilities & ServerCapabilities.CLIENT_SECURE_CONNECTION
      ) {
        seedWriter.writeBuffer(
          reader.readBuffer(Math.max(13, authPluginDataLength - 8))
        );
      }

      if (this.serverCapabilities & ServerCapabilities.CLIENT_PLUGIN_AUTH) {
        this.authPluginName = reader.readNullTerminatedString();
      }
    }
  }
}
