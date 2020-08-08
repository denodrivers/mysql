import '../lib/forge.js'
const forge = (self as any).forge;
const { publicKeyFromPem } = forge.pki;
function encryptWithPublicKey(key: string, data: Uint8Array):Uint8Array {
  const publicKey = publicKeyFromPem(key);
  const result = Array.prototype.map.call(data, i => String.fromCharCode(i)).join('');
  const cipher = publicKey.encrypt(result, 'RSA-OAEP')
  const encryptedData: Uint8Array = cipher.split('').map((item: string) => item.charCodeAt(0));
  return encryptedData
}

export { encryptWithPublicKey };