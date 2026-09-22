// « Temps écoulé », against a real migrated database.
//
// `tickUnit` is two statements in one transaction — decrement, then expire what
// reached 0 — and the rule worth pinning is its SCOPE: one unit, one character,
// active rows only. Units never convert into one another (a round elapsing
// leaves the minutes alone), a permanent effect sits outside the time scale
// altogether, and an expired one does not count down below zero.

import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PERMANENT_UNIT } from '@/constants/prophecy';
import { effects } from '@/db/schema';
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

const { createCharacter } = await import('@/repositories/characters');
const { createEffect, tickUnit } = await import('@/repositories/effects');

beforeEach(() => {
  harness?.close();
  harness = createTestDb();
});

const read = async (id: number) =>
  (await harness.db.select().from(effects).where(eq(effects.id, id)))[0];

describe('tickUnit', () => {
  it('decrements the chosen unit only, and expires what reaches 0', async () => {
    const c = await createCharacter({ nom: 'Aldric' });
    const last = await createEffect(c.id, { target: 'all', value: 1, durationUnit: 'round', durationRemaining: 1 });
    const more = await createEffect(c.id, { target: 'all', value: 1, durationUnit: 'round', durationRemaining: 3 });
    const minutes = await createEffect(c.id, { target: 'all', value: 1, durationUnit: 'minute', durationRemaining: 2 });

    await tickUnit(c.id, 'round');

    expect(await read(last.id)).toMatchObject({ durationRemaining: 0, expired: true });
    expect(await read(more.id)).toMatchObject({ durationRemaining: 2, expired: false });
    expect(await read(minutes.id)).toMatchObject({ durationRemaining: 2, expired: false });
  });

  it('leaves expired and permanent effects alone', async () => {
    const c = await createCharacter({ nom: 'Aldric' });
    const spent = await createEffect(c.id, {
      target: 'all',
      value: 1,
      durationUnit: 'round',
      durationRemaining: 0,
      expired: true,
    });
    const forever = await createEffect(c.id, {
      target: 'all',
      value: 1,
      durationUnit: PERMANENT_UNIT,
      durationRemaining: 0,
    });

    await tickUnit(c.id, 'round');

    expect(await read(spent.id)).toMatchObject({ durationRemaining: 0, expired: true });
    expect(await read(forever.id)).toMatchObject({ durationRemaining: 0, expired: false });
  });

  it('is scoped to one character', async () => {
    const a = await createCharacter({ nom: 'Aldric' });
    const b = await createCharacter({ nom: 'Brahim' });
    const other = await createEffect(b.id, { target: 'all', value: 1, durationUnit: 'round', durationRemaining: 2 });

    await tickUnit(a.id, 'round');

    expect((await read(other.id)).durationRemaining).toBe(2);
  });
});
