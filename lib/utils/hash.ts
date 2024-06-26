import { crypto, type DigestAlgorithm } from "@std/crypto";
import { xor } from "./bytes.ts";
import { MysqlError } from "./errors.ts";
import { encode } from "./encoding.ts";

async function hash(
  algorithm: DigestAlgorithm,
  data: Uint8Array,
): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.digest(algorithm, data));
}

async function mysqlNativePassword(
  password: string,
  seed: Uint8Array,
): Promise<Uint8Array> {
  const pwd1 = await hash("SHA-1", encode(password));
  const pwd2 = await hash("SHA-1", pwd1);

  let seedAndPwd2 = new Uint8Array(seed.length + pwd2.length);
  seedAndPwd2.set(seed);
  seedAndPwd2.set(pwd2, seed.length);
  seedAndPwd2 = await hash("SHA-1", seedAndPwd2);

  return xor(seedAndPwd2, pwd1);
}

async function cachingSha2Password(
  password: string,
  seed: Uint8Array,
): Promise<Uint8Array> {
  const stage1 = await hash("SHA-256", encode(password));
  const stage2 = await hash("SHA-256", stage1);
  const stage3 = await hash("SHA-256", Uint8Array.from([...stage2, ...seed]));
  return xor(stage1, stage3);
}

export default function auth(
  authPluginName: string,
  password: string,
  seed: Uint8Array,
) {
  switch (authPluginName) {
    case "mysql_native_password":
      // Native password authentication only need and will need 20-byte challenge.
      return mysqlNativePassword(password, seed.slice(0, 20));

    case "caching_sha2_password":
      return cachingSha2Password(password, seed);
    default:
      throw new MysqlError("Not supported");
  }
}
