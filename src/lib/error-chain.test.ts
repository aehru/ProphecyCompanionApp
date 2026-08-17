import { describe, expect, it } from 'vitest';

import { causeChain, describeError } from '@/lib/error-chain';

describe('causeChain', () => {
  it('is empty when nothing was wrapped', () => {
    expect(causeChain(new Error('boom'))).toEqual([]);
  });

  it('reports the wrapped reason, nearest first', () => {
    const inner = new TypeError('no such table');
    const outer = new Error('Failed query: SELECT 1', { cause: inner });
    expect(causeChain(outer)).toEqual(['TypeError: no such table']);
  });

  it('follows several links', () => {
    const a = new Error('a', { cause: new Error('b', { cause: new Error('c') }) });
    expect(causeChain(a)).toEqual(['Error: b', 'Error: c']);
  });

  it('handles a non-Error cause', () => {
    expect(causeChain(new Error('x', { cause: 'plain string' }))).toEqual(['plain string']);
    expect(causeChain(new Error('x', { cause: { code: 5 } }))).toEqual(['{"code":5}']);
  });

  it('stops on a cycle instead of hanging', () => {
    const a: { cause?: unknown } = {};
    a.cause = a;
    // Circular, so JSON.stringify throws and the String() fallback answers.
    expect(causeChain(a)).toEqual(['[object Object]']);
  });

  it('ignores a non-object throw', () => {
    expect(causeChain('nope')).toEqual([]);
    expect(causeChain(null)).toEqual([]);
  });
});

describe('describeError', () => {
  it('puts the real reason under the ceremonial wrapper', () => {
    const e = new Error('Failed query: CREATE TABLE x', { cause: new Error('disk I/O error') });
    expect(describeError(e)).toBe('Error: Failed query: CREATE TABLE x\n↳ Error: disk I/O error');
  });

  it('is just the message when there is no cause', () => {
    expect(describeError(new RangeError('out of range'))).toBe('RangeError: out of range');
  });
});
