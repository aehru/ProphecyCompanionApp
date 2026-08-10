import { describe, expect, it } from 'vitest';

import {
  formatEntry,
  formatReport,
  isStale,
  parseEntries,
  pruneOlderThan,
  RETENTION_MS,
  serializeEntries,
} from './serialize';
import type { LogEntry } from './types';

const entry = (over: Partial<LogEntry> = {}): LogEntry => ({
  t: 1_700_000_000_000,
  lvl: 'info',
  sid: 'abc123',
  msg: 'repo.write',
  ...over,
});

describe('NDJSON round trip', () => {
  it('survives serialize → parse', () => {
    const entries = [entry(), entry({ lvl: 'error', msg: 'error.uncaught' })];
    expect(parseEntries(serializeEntries(entries))).toEqual(entries);
  });

  it('drops a torn line and keeps the rest', () => {
    const good = JSON.stringify(entry());
    expect(parseEntries(`${good}\n{"t":1,"lvl":`)).toHaveLength(1);
  });

  it('drops a line that parses but is not an entry', () => {
    expect(parseEntries('{"hello":"world"}')).toEqual([]);
    expect(parseEntries('{"t":1,"lvl":"nope","msg":"x"}')).toEqual([]);
  });

  it('treats empty input as no entries', () => {
    expect(parseEntries('')).toEqual([]);
    expect(parseEntries(null)).toEqual([]);
  });
});

describe('retention', () => {
  const now = 1_700_000_000_000;
  const cutoff = now - RETENTION_MS;

  it('keeps entries inside the window', () => {
    const fresh = entry({ t: now });
    const old = entry({ t: cutoff - 1 });
    expect(pruneOlderThan([old, fresh], cutoff)).toEqual([fresh]);
  });

  it('calls a file stale only when nothing in it survives', () => {
    expect(isStale(serializeEntries([entry({ t: cutoff - 1 })]), cutoff)).toBe(true);
    expect(isStale(serializeEntries([entry({ t: now })]), cutoff)).toBe(false);
    expect(isStale('', cutoff)).toBe(true);
  });
});

describe('human formatting', () => {
  it('shows time, level, message, then payload and error', () => {
    const line = formatEntry(
      entry({ lvl: 'error', data: { characterId: 3 }, err: { name: 'Error', message: 'boom' } }),
    );
    expect(line).toContain('ERROR');
    expect(line).toContain('repo.write');
    expect(line).toContain('{"characterId":3}');
    expect(line).toContain('Error: boom');
  });

  it('heads a report with technical metadata only', () => {
    const report = formatReport([entry()], {
      appVersion: '0.12.0',
      platform: 'android',
      level: 'info',
      sessionId: 'abc123',
    });
    expect(report).toContain('# version : 0.12.0');
    expect(report).toContain('# entrées : 1');
    expect(report).toContain('repo.write');
  });
});
