export async function readFull(
  reader: Deno.Reader,
  buffer: Uint8Array
): Promise<number> {
  const size = buffer.length;
  let haveRead = 0;
  while (haveRead < size) {
    const nread = await reader.read(buffer.subarray(haveRead));
    if (nread === null) return 0;
    haveRead += nread;
  }
  return haveRead;
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export function encode(input: string) {
  return encoder.encode(input);
}

export function decode(input: BufferSource) {
  return decoder.decode(input);
}

export function xor(a: Uint8Array, b: Uint8Array): Uint8Array {
  return a.map((byte, index) => {
    return byte ^ b[index];
  });
}
