import { base64Decode } from "../../deps.ts";

async function encryptWithPublicKey(
  key: string,
  data: Uint8Array,
): Promise<ArrayBuffer> {
  const pemHeader = "-----BEGIN PUBLIC KEY-----\n";
  const pemFooter = "\n-----END PUBLIC KEY-----";
  key = key.trim();
  key = key.substring(pemHeader.length, key.length - pemFooter.length);
  const importedKey = await crypto.subtle.importKey(
    "spki",
    base64Decode(key),
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

export { encryptWithPublicKey };
