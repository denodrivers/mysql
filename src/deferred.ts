import { Deferred, deferred } from "../deps.ts";

/** @ignore */
export class DeferredStack<T> {
  private _queue: Deferred<T>[] = [];
  private _size = 0;

  constructor(
    readonly _maxSize: number,
    private _array: T[] = [],
    private readonly creator: () => Promise<T>,
  ) {
    this._size = _array.length;
  }

  get size(): number {
    return this._size;
  }

  get maxSize(): number {
    return this._maxSize;
  }

  get available(): number {
    return this._array.length;
  }

  async pop(): Promise<T> {
    if (this._array.length) {
      return this._array.pop()!;
    } else if (this._size < this._maxSize) {
      this._size++;
      const item = await this.creator();
      return item;
    }
    const defer = deferred<T>();
    this._queue.push(defer);
    await defer;
    return this._array.pop()!;
  }

  async push(item: T) {
    this._array.push(item);
    if (this._queue.length) {
      this._queue.shift()!.resolve();
    }
  }

  reduceSize() {
    this._size--;
  }
}
