import { describe, expect, it } from 'vitest';

import { isStorageLockError } from '@/lib/storage-lock';

/** A DOMException as it survives the worker channel: name + message, no class. */
const domLike = (name: string, message: string) => ({ name, message });

describe('isStorageLockError', () => {
  it('recognises the DOMException name', () => {
    expect(isStorageLockError(domLike('NoModificationAllowedError', 'No modification allowed'))).toBe(
      true,
    );
  });

  it('recognises the name alone, with no message', () => {
    expect(isStorageLockError(new Error('NoModificationAllowedError'))).toBe(true);
  });

  it('recognises the message alone, spaced and capitalised as the browser writes it', () => {
    expect(isStorageLockError(new Error('No modification allowed'))).toBe(true);
  });

  it('finds it under a Drizzle wrapper, which is how the app actually sees it', () => {
    const inner = new Error('NoModificationAllowedError: No modification allowed');
    const outer = new Error('Failed query: CREATE TABLE IF NOT EXISTS "__drizzle_migrations"', {
      cause: inner,
    });
    expect(isStorageLockError(outer)).toBe(true);
  });

  it('finds it several links down', () => {
    const e = new Error('a', {
      cause: new Error('b', { cause: domLike('NoModificationAllowedError', '') }),
    });
    expect(isStorageLockError(e)).toBe(true);
  });

  it('is false for a real database failure', () => {
    const outer = new Error('Failed query: SELECT 1', { cause: new Error('no such table: skills') });
    expect(isStorageLockError(outer)).toBe(false);
  });

  it('does not confuse SQLITE_BUSY with the OPFS lock — different problem, different cure', () => {
    expect(isStorageLockError(new Error('database is locked'))).toBe(false);
  });

  it('handles values that are not errors at all', () => {
    expect(isStorageLockError(null)).toBe(false);
    expect(isStorageLockError(undefined)).toBe(false);
    expect(isStorageLockError(42)).toBe(false);
    expect(isStorageLockError('NoModificationAllowedError')).toBe(true);
  });

  it('survives a cyclic cause chain', () => {
    const a: { name: string; message: string; cause?: unknown } = { name: 'A', message: 'a' };
    a.cause = a;
    expect(isStorageLockError(a)).toBe(false);
  });
});
