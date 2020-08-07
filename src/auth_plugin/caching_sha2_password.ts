import { xor } from '../util.ts';
import '/Users/georgexie/workspace/playground/forge/dist/forge.js'
import { byteFormat } from '../../deps.ts';
import { ReceivePacket, SendPacket } from '../packets/packet.ts';
import { parsePublicKey } from '../packets/parsers/handshake.ts';

const forge = (self as any).forge;
const { rsa, publicKeyFromPem, privateKeyFromPem } = forge.pki;

function encrypt(password: Uint8Array, scramble: Uint8Array, key: string): Uint8Array {
  const stage1 = xor(password, scramble)
  const result = Array.prototype.map.call(stage1, i => String.fromCharCode(i)).join('');

  const publicKey = publicKeyFromPem(key);
  const cipher = publicKey.encrypt(result, 'RSA-OAEP')
  const encryptedPassword: Uint8Array = cipher.split('').map((item: string) => item.charCodeAt(0));

  return encryptedPassword;
}

interface handler {
  done: boolean,
  next?: (packet: ReceivePacket) => any,
  data?: Uint8Array
}

let scramble:Uint8Array, password: string;
function start(scramble_: Uint8Array, password_: string): handler {
  scramble =  scramble_;
  password = password_;
  return { done: false, next: authMoreResponse}
}
function authMoreResponse(packet: ReceivePacket): handler {
  const enum AuthStatusFlags {
    FullAuth = 0x04,
    FastPath = 0x03,
  }
  const REQUEST_PUBLIC_KEY = 0x02;
  const statusFlag = packet.body.skip(1).readUint8();
  let authMoreData, done = true, next;
  if (statusFlag === AuthStatusFlags.FullAuth) {
    authMoreData = new Uint8Array([REQUEST_PUBLIC_KEY])
    done = false;
    next = encryptWithKey;
  }
  if (statusFlag === AuthStatusFlags.FastPath) {
    //noop
  }
  return { done, next, data: authMoreData}; 
}

function encryptWithKey(packet: ReceivePacket): handler {
      const publicKey = parsePublicKey(packet);
      const len = password.length;
      let passwordBuffer: Uint8Array = new Uint8Array(len + 1);
      for (let n = 0; n < len; n++) {
        passwordBuffer[n] = password.charCodeAt(n);
      }
      passwordBuffer[len] = 0x00;

      const encryptedPassword = encrypt(passwordBuffer, scramble, publicKey)
      return {done: false, next: done, data: encryptedPassword}
}

function done() {
  return {done: true}
}
export { start };