import { RSA } from "https://deno.land/x/god_crypto@v1.4.10/mod.ts";
function encryptWithPublicKey(key: string, data: Uint8Array): Uint8Array {
  const publicKey = RSA.parseKey(key);
  return RSA.encrypt(data, publicKey);
}

export { encryptWithPublicKey };
