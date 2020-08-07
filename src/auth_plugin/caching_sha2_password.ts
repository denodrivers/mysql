import { xor } from '../util.ts';
import '/Users/georgexie/workspace/playground/forge/dist/forge.js'
import { byteFormat } from '../../deps.ts';

const forge =(self as any).forge; 
const {rsa, publicKeyFromPem, privateKeyFromPem}  = forge.pki;

function encrypt(password: Uint8Array, scramble: Uint8Array, key: string): Uint8Array {
  // console.log('password: ', byteFormat(password) , byteFormat(scramble));
  const stage1 = xor(password, scramble)
  // console.log('stage1: ', byteFormat(stage1));
  //@ts-ignore
  const result = Array.prototype.map.call(stage1, i => String.fromCharCode(i)).join('');
  // console.log('stage1: ',result);
  // console.log('public key', key);
  
  const publicKey = publicKeyFromPem(key);
  const cipher = publicKey.encrypt(result, 'RSA-OAEP')
  const encryptedPassword: Uint8Array = cipher.split('').map((item: string) => item.charCodeAt(0));

  return encryptedPassword;
}
export { encrypt };