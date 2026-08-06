// Bounded in-memory log store: a FIFO capped on BOTH the entry count and the
// serialized byte size, so neither 1500 tiny breadcrumbs nor a handful of fat
// stack traces can grow the buffer without limit.
//
// Pure — no framework imports (see `types.ts`).

/** Default caps, matching what the diagnostic log ships with. */
export const MAX_ENTRIES = 1500;
export const MAX_BYTES = 512 * 1024;

export class RingBuffer<T> {
  private items: T[] = [];
  private sizes: number[] = [];
  private total = 0;

  constructor(
    private readonly maxEntries: number,
    private readonly maxBytes: number,
    private readonly sizeOf: (v: T) => number,
  ) {}

  /** Append, evicting from the front until both caps hold again. */
  push(value: T): void {
    const size = this.sizeOf(value);
    this.items.push(value);
    this.sizes.push(size);
    this.total += size;
    // `> 1` keeps the newest entry even when it alone busts the byte cap —
    // dropping the thing that just happened would be the worst possible loss.
    while (
      this.items.length > this.maxEntries ||
      (this.total > this.maxBytes && this.items.length > 1)
    ) {
      this.items.shift();
      this.total -= this.sizes.shift() ?? 0;
    }
  }

  /** Oldest → newest. A copy: callers may sort/slice it freely. */
  toArray(): T[] {
    return this.items.slice();
  }

  clear(): void {
    this.items = [];
    this.sizes = [];
    this.total = 0;
  }

  get length(): number {
    return this.items.length;
  }

  /** Serialized size currently held, in bytes. */
  get bytes(): number {
    return this.total;
  }
}
