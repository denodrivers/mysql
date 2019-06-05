import { encode } from "../../deps.ts";
import { Hash } from "https://deno.land/x/checksum@1.0.0/mod.ts";

/** @ignore */
export function auth(password: string, seed: Uint8Array): Uint8Array {
  const hash = new Hash("sha1");
  const pwd1 = hash.digest(encode(password)).data;
  const pwd2 = hash.digest(pwd1).data;

  let seedAndPwd2 = new Uint8Array(seed.length + pwd2.length);
  seedAndPwd2.set(seed);
  seedAndPwd2.set(pwd2, seed.length);
  seedAndPwd2 = hash.digest(seedAndPwd2).data;

  const data = seedAndPwd2.map((byte, index) => {
    return byte ^ pwd1[index];
  });

  return data;
}
