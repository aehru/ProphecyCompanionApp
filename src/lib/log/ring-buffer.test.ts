import { describe, expect, it } from 'vitest';

import { RingBuffer } from './ring-buffer';

const size = (s: string) => s.length;

describe('RingBuffer', () => {
  it('keeps insertion order', () => {
    const b = new RingBuffer<string>(10, 1000, size);
    b.push('a');
    b.push('b');
    expect(b.toArray()).toEqual(['a', 'b']);
  });

  it('evicts the oldest past the entry cap', () => {
    const b = new RingBuffer<string>(3, 1000, size);
    for (const v of ['a', 'b', 'c', 'd']) b.push(v);
    expect(b.toArray()).toEqual(['b', 'c', 'd']);
    expect(b.length).toBe(3);
  });

  it('evicts past the byte cap even when the entry cap holds', () => {
    const b = new RingBuffer<string>(100, 10, size);
    b.push('12345');
    b.push('12345');
    b.push('x');
    // 5 + 5 + 1 = 11 > 10 → the first goes.
    expect(b.toArray()).toEqual(['12345', 'x']);
    expect(b.bytes).toBe(6);
  });

  it('keeps a single oversized entry rather than losing what just happened', () => {
    const b = new RingBuffer<string>(100, 10, size);
    b.push('x'.repeat(50));
    expect(b.length).toBe(1);
    expect(b.bytes).toBe(50);
  });

  it('drops everything older when one huge entry arrives', () => {
    const b = new RingBuffer<string>(100, 10, size);
    b.push('abc');
    b.push('x'.repeat(50));
    expect(b.toArray()).toEqual(['x'.repeat(50)]);
  });

  it('resets its accounting on clear', () => {
    const b = new RingBuffer<string>(10, 100, size);
    b.push('abc');
    b.clear();
    expect(b.toArray()).toEqual([]);
    expect(b.bytes).toBe(0);
    expect(b.length).toBe(0);
  });

  it('hands out a copy, not the live array', () => {
    const b = new RingBuffer<string>(10, 100, size);
    b.push('a');
    b.toArray().push('b');
    expect(b.toArray()).toEqual(['a']);
  });
});
