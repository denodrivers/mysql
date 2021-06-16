import auth from "../../auth.ts";
import { BufferWriter } from "../../buffer.ts";

/** @ignore */
export function buildAuthSwitchResponse(
  authPluginName: string,
  seed: Uint8Array,
  password: string
): Uint8Array {
  const authData = auth(
    authPluginName,
    password,
    seed
  );
  const writer = new BufferWriter(new Uint8Array(authData.length));
  writer.writeBuffer(authData);
  return writer.wroteData;
}
