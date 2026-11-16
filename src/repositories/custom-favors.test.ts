// « Maison » Faveurs against a real migrated database: a star has no foreign
// key, so deleting the entry must take every Élu's star with it by hand.

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

const { createCharacter } = await import('@/repositories/characters');
const { setFavorite } = await import('@/repositories/favorites');
const { createCustomFavor, deleteCustomFavor } = await import('@/repositories/custom-favors');

beforeEach(() => {
  harness?.close();
  harness = createTestDb();
});

const stars = () =>
  harness.raw.prepare('SELECT kind, preset_id FROM favorites ORDER BY kind').all();

describe('deleteCustomFavor', () => {
  it('removes the entry and every Élu star on it, and nothing else', async () => {
    const a = await createCharacter({ nom: 'A' });
    const b = await createCharacter({ nom: 'B' });
    const house = await createCustomFavor({ dragon: 'brorne', level: 2, name: 'Don' });
    expect(house.id).toMatch(/^[0-9a-f-]{36}$/);

    await setFavorite(a.id, 'favor', house.id, true);
    await setFavorite(b.id, 'favor', house.id, true);
    // A manœuvre star sharing the uuid space must survive.
    await setFavorite(a.id, 'manoeuvre', house.id, true);

    await deleteCustomFavor(house.id);

    expect(stars()).toEqual([{ kind: 'manoeuvre', preset_id: house.id }]);
    expect(harness.raw.prepare('SELECT count(*) AS n FROM custom_favors').get()).toEqual({ n: 0 });
  });
});
