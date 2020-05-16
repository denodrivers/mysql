import { encode, Hash, sha256 } from "../deps.ts";

function xor(a: Uint8Array, b: Uint8Array): Uint8Array {
  return a.map((byte, index) => {
    return byte ^ b[index];
  });
}

function mysqlNativePassword(password: string, seed: Uint8Array): Uint8Array {
  const hash = new Hash("sha1");
  const pwd1 = hash.digest(encode(password)).data;
  const pwd2 = hash.digest(pwd1).data;

  let seedAndPwd2 = new Uint8Array(seed.length + pwd2.length);
  seedAndPwd2.set(seed);
  seedAndPwd2.set(pwd2, seed.length);
  seedAndPwd2 = hash.digest(seedAndPwd2).data;

  return xor(seedAndPwd2, pwd1);
}

function cachingSha2Password(password: string, seed: Uint8Array): Uint8Array {
  const stage1 = sha256(password, "utf8") as Uint8Array;
  const stage2 = sha256(stage1) as Uint8Array;
  const stage3 = sha256(Uint8Array.from([...stage2, ...seed])) as Uint8Array;
  return xor(stage1, stage3);
}

export default function auth(
  authPluginName: string,
  password: string,
  seed: Uint8Array,
) {
  switch (authPluginName) {
    case "mysql_native_password":
      return mysqlNativePassword(password, seed);

    case "caching_sha2_password":
    // TODO
    // return cachingSha2Password(password, seed);
    default:
      throw new Error("Not supported");
  }
}
