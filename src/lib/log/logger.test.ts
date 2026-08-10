import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Logger } from './logger';
import { parseEntries } from './serialize';
import type { LogSink, LogSlot } from './types';

/** A sink that records every write, so flush policy is observable. */
function fakeSink() {
  const files = new Map<LogSlot, string>();
  const writes: LogSlot[] = [];
  const sink: LogSink = {
    async read(slot) {
      return files.get(slot) ?? null;
    },
    async write(slot, text) {
      writes.push(slot);
      files.set(slot, text);
    },
    async remove(slot) {
      files.delete(slot);
    },
  };
  return { sink, files, writes };
}

function makeLogger(over: Partial<ConstructorParameters<typeof Logger>[0]> = {}) {
  const { sink, files, writes } = fakeSink();
  const logger = new Logger({
    sink,
    level: 'debug',
    sessionId: 'sess',
    debounceMs: 2000,
    now: () => 1_700_000_000_000,
    ...over,
  });
  return { logger, files, writes };
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('level filtering', () => {
  it('drops anything below the active level', () => {
    const { logger } = makeLogger({ level: 'warn' });
    logger.debug('a');
    logger.info('b');
    logger.warn('c');
    logger.error('d');
    expect(logger.entries().map((e) => e.msg)).toEqual(['c', 'd']);
  });

  it('applies a level change immediately', () => {
    const { logger } = makeLogger({ level: 'error' });
    logger.info('before');
    logger.setLevel('info');
    logger.info('after');
    expect(logger.entries().map((e) => e.msg)).toEqual(['after']);
  });
});

describe('entries', () => {
  it('stamps session, time and level, and redacts the payload', () => {
    const { logger } = makeLogger();
    logger.info('repo.write', { characterId: 4, nom: 'Aldric' });
    expect(logger.entries()[0]).toEqual({
      t: 1_700_000_000_000,
      lvl: 'info',
      sid: 'sess',
      msg: 'repo.write',
      data: { characterId: 4, _dropped: 1 },
      err: undefined,
    });
  });

  it('attaches a normalized error', () => {
    const { logger } = makeLogger();
    logger.error('error.uncaught', new Error('boom'));
    expect(logger.entries()[0].err?.message).toBe('boom');
  });
});

describe('flush policy', () => {
  it('debounces a normal write', async () => {
    const { logger, writes } = makeLogger();
    logger.info('a');
    logger.info('b');
    expect(writes).toEqual([]);
    await vi.advanceTimersByTimeAsync(2000);
    expect(writes).toEqual(['current']);
  });

  it('flushes an error immediately', async () => {
    const { logger, writes } = makeLogger();
    logger.error('error.uncaught', new Error('boom'));
    await vi.advanceTimersByTimeAsync(0);
    expect(writes).toEqual(['current']);
  });

  it('rewrites `current` wholesale instead of appending', async () => {
    const { logger, files } = makeLogger();
    logger.info('a');
    await logger.flush();
    logger.info('b');
    await logger.flush();
    const written = parseEntries(files.get('current'));
    expect(written.map((e) => e.msg)).toEqual(['a', 'b']);
    expect(files.get('current')?.split('\n')).toHaveLength(2);
  });

  it('never touches `previous` on its own', async () => {
    const { logger, writes } = makeLogger();
    logger.info('a');
    await logger.flush();
    expect(writes).not.toContain('previous');
  });

  it('skips the write when nothing changed', async () => {
    const { logger, writes } = makeLogger();
    logger.info('a');
    await logger.flush();
    await logger.flush();
    expect(writes).toEqual(['current']);
  });

  it('keeps the entries and retries after a failed write', async () => {
    const { sink } = fakeSink();
    let fail = true;
    const failing: LogSink = {
      ...sink,
      async write(slot, text) {
        if (fail) throw new Error('disk full');
        return sink.write(slot, text);
      },
    };
    const logger = new Logger({ sink: failing, level: 'debug', sessionId: 's' });
    logger.info('a');
    await logger.flush();
    fail = false;
    await logger.flush();
    expect(parseEntries(await failing.read('current')).map((e) => e.msg)).toEqual(['a']);
  });

  it('resolves rather than rejecting when there is no sink at all', async () => {
    const logger = new Logger({ sink: null });
    logger.error('boom', new Error('x'));
    await expect(logger.flush()).resolves.toBeUndefined();
  });
});

describe('caps', () => {
  it('honours the entry cap', () => {
    const { logger } = makeLogger({ maxEntries: 3 });
    for (const m of ['a', 'b', 'c', 'd']) logger.info(m);
    expect(logger.entries().map((e) => e.msg)).toEqual(['b', 'c', 'd']);
  });
});

describe('clear', () => {
  it('empties memory and both files', async () => {
    const { logger, files } = makeLogger();
    logger.info('a');
    await logger.flush();
    await files.set('previous', 'stale');
    await logger.clear();
    expect(logger.entries()).toEqual([]);
    expect(files.has('current')).toBe(false);
    expect(files.has('previous')).toBe(false);
  });
});

describe('subscribe', () => {
  it('notifies on every write and stops after unsubscribe', () => {
    const { logger } = makeLogger();
    const seen = vi.fn();
    const off = logger.subscribe(seen);
    logger.info('a');
    logger.info('b');
    off();
    logger.info('c');
    expect(seen).toHaveBeenCalledTimes(2);
  });

  it('keeps logging when a listener throws', () => {
    const { logger } = makeLogger();
    logger.subscribe(() => {
      throw new Error('bad listener');
    });
    expect(() => logger.info('a')).not.toThrow();
    expect(logger.entries()).toHaveLength(1);
  });
});
