import { xor } from "../util.ts";
import { ReceivePacket } from "../packets/packet.ts";
import { encryptWithPublicKey } from "./crypt.ts";

interface handler {
  done: boolean;
  quickRead?: boolean;
  next?: (packet: ReceivePacket) => any;
  data?: Uint8Array;
}

let scramble: Uint8Array, password: string;

async function start(
  scramble_: Uint8Array,
  password_: string,
): Promise<handler> {
  scramble = scramble_;
  password = password_;
  return { done: false, next: authMoreResponse };
}

async function authMoreResponse(packet: ReceivePacket): Promise<handler> {
  const enum AuthStatusFlags {
    FullAuth = 0x04,
    FastPath = 0x03,
  }
  const REQUEST_PUBLIC_KEY = 0x02;
  const statusFlag = packet.body.skip(1).readUint8();
  let authMoreData, done = true, next, quickRead = false;
  if (statusFlag === AuthStatusFlags.FullAuth) {
    authMoreData = new Uint8Array([REQUEST_PUBLIC_KEY]);
    done = false;
    next = encryptWithKey;
  }
  if (statusFlag === AuthStatusFlags.FastPath) {
    done = false;
    quickRead = true;
    next = terminate;
  }
  return { done, next, quickRead, data: authMoreData };
}

async function encryptWithKey(packet: ReceivePacket): Promise<handler> {
  const publicKey = parsePublicKey(packet);
  const len = password.length;
  const passwordBuffer: Uint8Array = new Uint8Array(len + 1);
  for (let n = 0; n < len; n++) {
    passwordBuffer[n] = password.charCodeAt(n);
  }
  passwordBuffer[len] = 0x00;

  const encryptedPassword = await encrypt(passwordBuffer, scramble, publicKey);
  return {
    done: false,
    next: terminate,
    data: new Uint8Array(encryptedPassword),
  };
}

function parsePublicKey(packet: ReceivePacket): string {
  return packet.body.skip(1).readNullTerminatedString();
}

async function encrypt(
  password: Uint8Array,
  scramble: Uint8Array,
  key: string,
): Promise<ArrayBuffer> {
  const stage1 = xor(password, scramble);
  return await encryptWithPublicKey(key, stage1);
}

function terminate() {
  return { done: true };
}

export { start };
