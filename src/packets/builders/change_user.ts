import { BufferWriter } from "../../buffer.ts";

/** @ignore */
export function buildChangeUser(authPluginName: string, username: string, db: string): Uint8Array {
  const writer = new BufferWriter(new Uint8Array(128));
  writer.write(0x11); // COM_CHANGE_USER
  writer.writeNullTerminatedString(username);
  writer.write(authPluginName.length).writeString(authPluginName);
  writer.writeNullTerminatedString(db);
  return writer.buffer;
}
