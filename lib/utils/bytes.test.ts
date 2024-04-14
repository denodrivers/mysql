import { assertEquals } from "@std/assert";
import { hexdump } from "./bytes.ts";

Deno.test("hexdump", async (t) => {
  const data =
    "This is a test string that is longer than 16 bytes and will be split into multiple lines for the hexdump. The quick brown fox jumps over the lazy dog. Foo bar baz.";
  const buffer8Compatible = new TextEncoder().encode(data);

  function bufferPad(buffer: ArrayBufferView, multipleOf: number): number[] {
    const bufferLength = buffer.byteLength;
    const remainder = Math.ceil(bufferLength / multipleOf);
    const padCeil = remainder * multipleOf;
    const missing = padCeil - bufferLength;

    const result = [];
    for (let i = 0; i < missing; i++) {
      result.push(0);
    }

    return result;
  }

  const buffer16Compatible =
    new Uint8Array([...buffer8Compatible, ...bufferPad(buffer8Compatible, 2)])
      .buffer;
  const buffer32Compatible =
    new Uint8Array([...buffer8Compatible, ...bufferPad(buffer8Compatible, 4)])
      .buffer;
  const buffer64Compatible =
    new Uint8Array([...buffer8Compatible, ...bufferPad(buffer8Compatible, 8)])
      .buffer;

  const buffer8Result =
    `00000000  54 68 69 73 20 69 73 20  61 20 74 65 73 74 20 73  |This is a test s|
00000010  74 72 69 6e 67 20 74 68  61 74 20 69 73 20 6c 6f  |tring that is lo|
00000020  6e 67 65 72 20 74 68 61  6e 20 31 36 20 62 79 74  |nger than 16 byt|
00000030  65 73 20 61 6e 64 20 77  69 6c 6c 20 62 65 20 73  |es and will be s|
00000040  70 6c 69 74 20 69 6e 74  6f 20 6d 75 6c 74 69 70  |plit into multip|
00000050  6c 65 20 6c 69 6e 65 73  20 66 6f 72 20 74 68 65  |le lines for the|
00000060  20 68 65 78 64 75 6d 70  2e 20 54 68 65 20 71 75  | hexdump. The qu|
00000070  69 63 6b 20 62 72 6f 77  6e 20 66 6f 78 20 6a 75  |ick brown fox ju|
00000080  6d 70 73 20 6f 76 65 72  20 74 68 65 20 6c 61 7a  |mps over the laz|
00000090  79 20 64 6f 67 2e 20 46  6f 6f 20 62 61 72 20 62  |y dog. Foo bar b|
000000a0  61 7a 2e                                          |az.|`;

  const buffer16Result =
    `00000000  54 68 69 73 20 69 73 20  61 20 74 65 73 74 20 73  |This is a test s|
00000010  74 72 69 6e 67 20 74 68  61 74 20 69 73 20 6c 6f  |tring that is lo|
00000020  6e 67 65 72 20 74 68 61  6e 20 31 36 20 62 79 74  |nger than 16 byt|
00000030  65 73 20 61 6e 64 20 77  69 6c 6c 20 62 65 20 73  |es and will be s|
00000040  70 6c 69 74 20 69 6e 74  6f 20 6d 75 6c 74 69 70  |plit into multip|
00000050  6c 65 20 6c 69 6e 65 73  20 66 6f 72 20 74 68 65  |le lines for the|
00000060  20 68 65 78 64 75 6d 70  2e 20 54 68 65 20 71 75  | hexdump. The qu|
00000070  69 63 6b 20 62 72 6f 77  6e 20 66 6f 78 20 6a 75  |ick brown fox ju|
00000080  6d 70 73 20 6f 76 65 72  20 74 68 65 20 6c 61 7a  |mps over the laz|
00000090  79 20 64 6f 67 2e 20 46  6f 6f 20 62 61 72 20 62  |y dog. Foo bar b|
000000a0  61 7a 2e 00                                       |az..|`;

  const buffer32Result =
    `00000000  54 68 69 73 20 69 73 20  61 20 74 65 73 74 20 73  |This is a test s|
00000010  74 72 69 6e 67 20 74 68  61 74 20 69 73 20 6c 6f  |tring that is lo|
00000020  6e 67 65 72 20 74 68 61  6e 20 31 36 20 62 79 74  |nger than 16 byt|
00000030  65 73 20 61 6e 64 20 77  69 6c 6c 20 62 65 20 73  |es and will be s|
00000040  70 6c 69 74 20 69 6e 74  6f 20 6d 75 6c 74 69 70  |plit into multip|
00000050  6c 65 20 6c 69 6e 65 73  20 66 6f 72 20 74 68 65  |le lines for the|
00000060  20 68 65 78 64 75 6d 70  2e 20 54 68 65 20 71 75  | hexdump. The qu|
00000070  69 63 6b 20 62 72 6f 77  6e 20 66 6f 78 20 6a 75  |ick brown fox ju|
00000080  6d 70 73 20 6f 76 65 72  20 74 68 65 20 6c 61 7a  |mps over the laz|
00000090  79 20 64 6f 67 2e 20 46  6f 6f 20 62 61 72 20 62  |y dog. Foo bar b|
000000a0  61 7a 2e 00                                       |az..|`;
  const buffer64Result =
    `00000000  54 68 69 73 20 69 73 20  61 20 74 65 73 74 20 73  |This is a test s|
00000010  74 72 69 6e 67 20 74 68  61 74 20 69 73 20 6c 6f  |tring that is lo|
00000020  6e 67 65 72 20 74 68 61  6e 20 31 36 20 62 79 74  |nger than 16 byt|
00000030  65 73 20 61 6e 64 20 77  69 6c 6c 20 62 65 20 73  |es and will be s|
00000040  70 6c 69 74 20 69 6e 74  6f 20 6d 75 6c 74 69 70  |plit into multip|
00000050  6c 65 20 6c 69 6e 65 73  20 66 6f 72 20 74 68 65  |le lines for the|
00000060  20 68 65 78 64 75 6d 70  2e 20 54 68 65 20 71 75  | hexdump. The qu|
00000070  69 63 6b 20 62 72 6f 77  6e 20 66 6f 78 20 6a 75  |ick brown fox ju|
00000080  6d 70 73 20 6f 76 65 72  20 74 68 65 20 6c 61 7a  |mps over the laz|
00000090  79 20 64 6f 67 2e 20 46  6f 6f 20 62 61 72 20 62  |y dog. Foo bar b|
000000a0  61 7a 2e 00 00 00 00 00                           |az......|`;

  await t.step("Uint8Array", () => {
    const result = hexdump(buffer8Compatible);
    assertEquals(result, buffer8Result);
  });

  await t.step("Uint16Array", () => {
    const result = hexdump(new Uint16Array(buffer16Compatible));
    assertEquals(result, buffer16Result);
  });

  await t.step("Uint32Array", () => {
    const result = hexdump(new Uint32Array(buffer32Compatible));
    assertEquals(result, buffer32Result);
  });

  await t.step("Uint8ClampedArray", () => {
    const result = hexdump(new Uint8ClampedArray(buffer8Compatible.buffer));
    assertEquals(result, buffer8Result);
  });

  await t.step("Int8Array", () => {
    const result = hexdump(new Int8Array(buffer8Compatible.buffer));
    assertEquals(result, buffer8Result);
  });

  await t.step("Int16Array", () => {
    const result = hexdump(new Int16Array(buffer16Compatible));
    assertEquals(result, buffer16Result);
  });

  await t.step("Int32Array", () => {
    const result = hexdump(new Int32Array(buffer32Compatible));
    assertEquals(result, buffer32Result);
  });

  await t.step("Float32Array", () => {
    const result = hexdump(new Float32Array(buffer32Compatible));
    assertEquals(result, buffer32Result);
  });

  await t.step("Float64Array", () => {
    const result = hexdump(new Float64Array(buffer64Compatible));
    assertEquals(result, buffer64Result);
  });

  await t.step("BigInt64Array", () => {
    const result = hexdump(new BigInt64Array(buffer64Compatible));
    assertEquals(result, buffer64Result);
  });

  await t.step("BigUint64Array", () => {
    const result = hexdump(new BigUint64Array(buffer64Compatible));
    assertEquals(result, buffer64Result);
  });

  await t.step("DataView", () => {
    const result = hexdump(new DataView(buffer8Compatible.buffer));
    assertEquals(result, buffer8Result);
  });
});
