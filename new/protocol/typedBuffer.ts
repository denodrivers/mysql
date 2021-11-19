const encoder = new TextEncoder();
const decoder = new TextDecoder();

function encode(input: string) {
  return encoder.encode(input);
}

function decode(input: BufferSource) {
  return decoder.decode(input);
}

export class TypedReader {
  #pos: number = 0;
  #buffer: Uint8Array;

  constructor(buffer: Uint8Array) {
    this.#buffer = buffer;
  }

  get finished(): boolean {
    return this.#pos >= this.#buffer.length;
  }

  skip(len: number): this {
    this.#pos += len;
    return this;
  }

  readBuffer(len: number): Uint8Array {
    const buffer = this.#buffer.slice(this.#pos, this.#pos + len);
    this.#pos += len;
    return buffer;
  }

  readUints(len: number): number {
    let num = 0;
    for (let n = 0; n < len; n++) {
      num += this.#buffer[this.#pos++] << (8 * n);
    }
    return num;
  }

  readUint8(): number {
    return this.#buffer[this.#pos++];
  }

  readUint16(): number {
    return this.readUints(2);
  }

  readUint32(): number {
    return this.readUints(4);
  }

  readUint64(): number {
    return this.readUints(8);
  }

  readNullTerminatedString(): string {
    let end = this.#buffer.indexOf(0x00, this.#pos);
    if (end === -1) end = this.#buffer.length;
    const buf = this.#buffer.slice(this.#pos, end);
    this.#pos += buf.length + 1;
    return decode(buf);
  }

  readString(len: number): string {
    const str = decode(this.#buffer.slice(this.#pos, this.#pos + len));
    this.#pos += len;
    return str;
  }

  readEncodedLen(): number {
    const first = this.readUint8();
    if (first < 251) {
      return first;
    } else {
      if (first == 0xfc) {
        return this.readUint16();
      } else if (first == 0xfd) {
        return this.readUints(3);
      } else if (first == 0xfe) {
        return this.readUints(8);
      }
    }
    return -1;
  }

  readLenCodeString(): string | null {
    const len = this.readEncodedLen();
    if (len == -1) return null;
    return this.readString(len);
  }
}

export class TypedWriter {
  #pos: number = 0;
  #buffer: Uint8Array;

  constructor(initLength: number = 1024) {
    this.#buffer = new Uint8Array(initLength);
  }

  get data(): Uint8Array {
    return this.#buffer.slice(0, this.#pos);
  }

  get length(): number {
    return this.#pos;
  }

  get capacity(): number {
    return this.#buffer.length - this.#pos;
  }

  #growth(length: number) {
    if (this.#pos + length > this.#buffer.length) {
      const newBuffer = new Uint8Array(this.#buffer.length * 2);
      newBuffer.set(this.#buffer, 0);
      this.#buffer = newBuffer;
    }
  }

  skip(len: number): this {
    this.#growth(1);
    this.#pos += len;
    return this;
  }

  writeBuffer(buffer: Uint8Array): this {
    this.#growth(buffer.length);
    if (buffer.length > this.capacity) {
      buffer = buffer.slice(0, this.capacity);
    }
    this.#buffer.set(buffer, this.#pos);
    this.#pos += buffer.length;
    return this;
  }

  write(byte: number): this {
    this.#growth(1);
    this.#buffer[this.#pos++] = byte;
    return this;
  }

  writeUint16(num: number): this {
    return this.writeUints(2, num);
  }

  writeUint32(num: number): this {
    return this.writeUints(4, num);
  }

  writeUint64(num: number): this {
    return this.writeUints(8, num);
  }

  writeUints(len: number, num: number): this {
    this.#growth(len);
    for (let n = 0; n < len; n++) {
      this.#buffer[this.#pos++] = (num >> (n * 8)) & 0xff;
    }
    return this;
  }

  writeNullTerminatedString(str: string): this {
    return this.writeString(str).write(0x00);
  }

  writeString(str: string): this {
    const buf = encode(str);
    this.#growth(buf.length);
    this.#buffer.set(buf, this.#pos);
    this.#pos += buf.length;
    return this;
  }
}
