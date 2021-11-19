import { Deferred, deferred } from '../deps.ts';

export class DeferredStack<T> {
  #queue: Deferred<T>[] = [];
  #size = 0;
  #array: T[] = [];
  #maxSize: number;

  constructor(
    maxSize: number,
    array: T[] = [],
    private readonly creator: () => Promise<T>
  ) {
    this.#size = array.length;
    this.#array = array;
    this.#maxSize = maxSize;
  }

  get size(): number {
    return this.#size;
  }

  get maxSize(): number {
    return this.#maxSize;
  }

  get available(): number {
    return this.#array.length;
  }

  async pop(): Promise<T> {
    if (this.#array.length) {
      return this.#array.pop()!;
    } else if (this.#size < this.#maxSize) {
      this.#size++;
      let item: T;
      try {
        item = await this.creator();
      } catch (err) {
        this.#size--;
        throw err;
      }
      return item;
    }
    const defer = deferred<T>();
    this.#queue.push(defer);
    return await defer;
  }

  /** Returns false if the item is consumed by a deferred pop */
  push(item: T): boolean {
    if (this.#queue.length) {
      this.#queue.shift()!.resolve(item);
      return false;
    } else {
      this.#array.push(item);
      return true;
    }
  }

  tryPopAvailable() {
    return this.#array.pop();
  }

  remove(item: T): boolean {
    const index = this.#array.indexOf(item);
    if (index < 0) return false;
    this.#array.splice(index, 1);
    this.#size--;
    return true;
  }

  reduceSize() {
    this.#size--;
  }
}
