import { decodeBase64 } from "@std/encoding/base64";

export async function encryptWithPublicKey(
  key: string,
  data: Uint8Array,
): Promise<ArrayBuffer> {
  const pemHeader = "-----BEGIN PUBLIC KEY-----\n";
  const pemFooter = "\n-----END PUBLIC KEY-----";
  key = key.trim();
  key = key.substring(pemHeader.length, key.length - pemFooter.length);
  const importedKey = await crypto.subtle.importKey(
    "spki",
    decodeBase64(key),
    { name: "RSA-OAEP", hash: "SHA-256" },
    false,
    ["encrypt"],
  );

  return await crypto.subtle.encrypt(
    {
      name: "RSA-OAEP",
    },
    importedKey,
    data,
  );
}
