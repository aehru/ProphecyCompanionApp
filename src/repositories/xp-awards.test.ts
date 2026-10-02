// The xp_awards repository, against a REAL migrated database: one open
// scénario at a time, closing it counts toward the earned total, and the rows
// cascade with their character.

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createTestDb, type TestDb } from '@/repositories/test-db';

let harness: TestDb;

vi.mock('@/db/client', () => ({
  get db() {
    return harness.db;
  },
  transaction: <T,>(body: (tx: unknown) => Promise<T>) => harness.transaction(body),
}));
vi.mock('@/lib/media', () => ({
  copyMedia: () => null,
  deleteMedia: () => {},
  deleteCharacterMedia: () => {},
}));
vi.mock('@/lib/log', () => ({
  log: { debug: () => {}, info: () => {}, warn: () => {}, error: () => {} },
}));

const { createCharacter, deleteCharacter } = await import('@/repositories/characters');
const { endScenario, startScenario, xpAwardsQuery } = await import('@/repositories/xp-awards');
const { xpEarned } = await import('@/lib/xp');

beforeEach(() => {
  harness?.close();
  harness = createTestDb();
});

const scores = { danger: 2, decouverte: 1, magie: 0, implication: 4, initiatives: 3 };

describe('xp awards', () => {
  it('keeps one open scénario and counts it once closed', async () => {
    const c = await createCharacter({ nom: 'Aldric' });
    const first = await startScenario(c.id, 'implication', 'La tour');
    const again = await startScenario(c.id, 'danger');
    expect(again.id).toBe(first.id);

    expect(xpEarned(5, await xpAwardsQuery(c.id))).toBe(5);
    await endScenario(first.id, scores);
    const rows = await xpAwardsQuery(c.id);
    expect(rows[0].endedAt).toBeInstanceOf(Date);
    expect(xpEarned(5, rows)).toBe(5 + 10 + 4);

    const next = await startScenario(c.id, 'danger');
    expect(next.id).not.toBe(first.id);
  });

  it('cascades with the character', async () => {
    const c = await createCharacter({ nom: 'Aldric' });
    await startScenario(c.id, 'magie');
    await deleteCharacter(c.id);
    expect(await xpAwardsQuery(c.id)).toEqual([]);
  });
});
