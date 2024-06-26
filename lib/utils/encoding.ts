const encoder = new TextEncoder();
const decoder = new TextDecoder();

/**
 * Shorthand for `new TextEncoder().encode(input)`.
 */
export function encode(input: string) {
  return encoder.encode(input);
}

/**
 * Shorthand for `new TextDecoder().decode(input)`.
 */
export function decode(input: BufferSource) {
  return decoder.decode(input);
}
