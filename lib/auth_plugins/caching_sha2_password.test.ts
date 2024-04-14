import { assertEquals } from "@std/assert";
import { PacketReader } from "../packets/packet.ts";
import {
  AuthPluginCachingSha2Password,
  AuthStatusFlags,
} from "./caching_sha2_password.ts";
import { PacketType } from "../constant/packet.ts";
import { BufferReader } from "../buffer.ts";

Deno.test("AuthPluginCachingSha2Password", async (t) => {
  await t.step("statusFlag FastPath", async () => {
    const scramble = new Uint8Array([1, 2, 3]);
    const password = "password";
    const authPlugin = new AuthPluginCachingSha2Password(scramble, password);

    assertEquals(authPlugin.scramble, scramble);
    assertEquals(authPlugin.password, password);
    assertEquals(authPlugin.done, false);
    assertEquals(authPlugin.quickRead, false);
    assertEquals(authPlugin.data, undefined);

    const bodyReader = new BufferReader(
      new Uint8Array([0x00, AuthStatusFlags.FastPath]),
    );
    await authPlugin.next(
      new PacketReader({ size: 2, no: 0 }, bodyReader, PacketType.OK_Packet),
    );

    assertEquals(authPlugin.done, false);
    assertEquals(authPlugin.data, undefined);
    assertEquals(authPlugin.quickRead, true);

    await authPlugin.next(
      new PacketReader({ size: 2, no: 0 }, bodyReader, PacketType.OK_Packet),
    );

    assertEquals(authPlugin.done, true);
  });

  await t.step("statusFlag FullAuth", async () => {
    const scramble = new Uint8Array([1, 2, 3]);
    const password = "password";
    const authPlugin = new AuthPluginCachingSha2Password(scramble, password);

    assertEquals(authPlugin.scramble, scramble);
    assertEquals(authPlugin.password, password);
    assertEquals(authPlugin.done, false);
    assertEquals(authPlugin.quickRead, false);
    assertEquals(authPlugin.data, undefined);

    let bodyReader = new BufferReader(
      new Uint8Array([0x00, AuthStatusFlags.FullAuth]),
    );
    await authPlugin.next(
      new PacketReader({ size: 2, no: 0 }, bodyReader, PacketType.OK_Packet),
    );

    assertEquals(authPlugin.done, false);
    assertEquals(authPlugin.data, new Uint8Array([0x02]));
    assertEquals(authPlugin.quickRead, false);

    const publicKey = `-----BEGIN PUBLIC KEY-----
MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCkFF85HndOJoTVsuYBNOu4N63s
bVMWfMVZ/ZXFVYeFE7H6Vp0jhu2d6JUUx9WCXV5JOt/mXoCirywhz2LM+f7kaBCh
0YIFh5JKS43a3COC9BJupj2dco/iWEmOFqRvCn/ErQNdmataqQlePq3SitusJwuj
PQogsoytp/nSKLsTLwIDA/+/
-----END PUBLIC KEY-----`;

    const encodedPublicKey = new TextEncoder().encode(publicKey);

    bodyReader = new BufferReader(new Uint8Array([0x00, ...encodedPublicKey]));
    await authPlugin.next(
      new PacketReader({ size: 2, no: 0 }, bodyReader, PacketType.OK_Packet),
    );

    assertEquals(authPlugin.done, false);
    assertEquals(authPlugin.data?.length, 128);
    assertEquals(authPlugin.quickRead, false);

    await authPlugin.next(
      new PacketReader({ size: 2, no: 0 }, bodyReader, PacketType.OK_Packet),
    );

    assertEquals(authPlugin.done, true);
  });
});
