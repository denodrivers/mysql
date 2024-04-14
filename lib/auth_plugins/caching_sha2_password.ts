import { xor } from "../utils/bytes.ts";
import type { PacketReader } from "../packets/packet.ts";
import { encryptWithPublicKey } from "../utils/crypto.ts";

export const enum AuthStatusFlags {
  FullAuth = 0x04,
  FastPath = 0x03,
}

export class AuthPluginCachingSha2Password {
  readonly scramble: Uint8Array;
  readonly password: string;
  done: boolean = false;
  quickRead: boolean = false;
  data: Uint8Array | undefined = undefined;

  next: (packet: PacketReader) => Promise<this> = this.authMoreResponse.bind(
    this,
  );

  constructor(scramble: Uint8Array, password: string) {
    this.scramble = scramble;
    this.password = password;
  }

  protected terminate() {
    this.done = true;
    return Promise.resolve(this);
  }

  protected authMoreResponse(packet: PacketReader): Promise<this> {
    const REQUEST_PUBLIC_KEY = 0x02;
    const statusFlag = packet.body.skip(1).readUint8();

    switch (statusFlag) {
      case AuthStatusFlags.FullAuth: {
        this.data = new Uint8Array([REQUEST_PUBLIC_KEY]);
        this.next = this.encryptWithKey.bind(this);
        break;
      }
      case AuthStatusFlags.FastPath: {
        this.quickRead = true;
        this.next = this.terminate.bind(this);
        break;
      }
      default:
        this.done = true;
    }

    return Promise.resolve(this);
  }

  protected async encryptWithKey(packet: PacketReader): Promise<this> {
    const publicKey = this.parsePublicKey(packet);
    const len = this.password.length;
    const passwordBuffer: Uint8Array = new Uint8Array(len + 1);
    for (let n = 0; n < len; n++) {
      passwordBuffer[n] = this.password.charCodeAt(n);
    }
    passwordBuffer[len] = 0x00;

    const encryptedPassword = await this.encrypt(
      passwordBuffer,
      this.scramble,
      publicKey,
    );
    this.next = this.terminate.bind(this);
    this.data = new Uint8Array(encryptedPassword);
    return this;
  }

  protected parsePublicKey(packet: PacketReader): string {
    return packet.body.skip(1).readNullTerminatedString();
  }

  async encrypt(
    password: Uint8Array,
    scramble: Uint8Array,
    key: string,
  ): Promise<ArrayBuffer> {
    const stage1 = xor(password, scramble);
    return await encryptWithPublicKey(key, stage1);
  }
}
