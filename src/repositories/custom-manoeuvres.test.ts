// « Maison » manœuvres against a real migrated database: a star has no foreign
// key, so deleting the entry must take every character's star with it by hand.

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
const { createCustomManoeuvre, deleteCustomManoeuvre } = await import(
  '@/repositories/custom-manoeuvres'
);

beforeEach(() => {
  harness?.close();
  harness = createTestDb();
});

const stars = () =>
  harness.raw.prepare('SELECT preset_id FROM favorites ORDER BY preset_id').all();

describe('deleteCustomManoeuvre', () => {
  it('removes the entry and every star on it, and nothing else', async () => {
    const a = await createCharacter({ nom: 'A' });
    const b = await createCharacter({ nom: 'B' });
    const house = await createCustomManoeuvre({ name: 'Coup de tête', description: 'x' });
    expect(house.id).toMatch(/^[0-9a-f-]{36}$/);

    await setFavorite(a.id, 'manoeuvre', house.id, true);
    await setFavorite(b.id, 'manoeuvre', house.id, true);
    await setFavorite(a.id, 'manoeuvre', 'melee-feinter', true);

    await deleteCustomManoeuvre(house.id);

    expect(stars()).toEqual([{ preset_id: 'melee-feinter' }]);
    expect(harness.raw.prepare('SELECT count(*) AS n FROM custom_manoeuvres').get()).toEqual({
      n: 0,
    });
  });
});
