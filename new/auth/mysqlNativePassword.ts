import { createHash, SupportedAlgorithm } from '../../deps.ts';
import { encode, xor } from '../util.ts';
import { AuthPlugin } from './base.ts';

function hash(algorithm: SupportedAlgorithm, data: Uint8Array): Uint8Array {
  return new Uint8Array(createHash(algorithm).update(data).digest());
}

export class MysqlNativePasswordPlugin extends AuthPlugin {
  name: string = '';

  authData() {
    const { password } = this.config;
    const { seed } = this.handshake;
    const pwd1 = hash('sha1', encode(password!));
    const pwd2 = hash('sha1', pwd1);

    let seedAndPwd2 = new Uint8Array(seed!.length + pwd2.length);
    seedAndPwd2.set(seed!);
    seedAndPwd2.set(pwd2, seed!.length);
    seedAndPwd2 = hash('sha1', seedAndPwd2);

    const data = xor(seedAndPwd2, pwd1);
  }

  async auth(): Promise<void> {}
}
