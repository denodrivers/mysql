async function encryptWithPublicKey(
  key: string,
  data: Uint8Array,
): Promise<ArrayBuffer> {
  const importedKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(key),
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
