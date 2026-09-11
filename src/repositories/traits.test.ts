// The traits repository, against a REAL migrated database.
//
// `lib/trait-pool.test.ts` covers the arithmetic. This covers what only SQLite
// can answer: that both kinds come back from one query in insertion order (the
// pool needs both halves at once), and that traits cascade with their character
// like every other child table.

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createTestDb, type TestDb } from '@/repositories/test-db';

let harness: TestDb;

vi.mock('@/db/client', () => ({
  get db() {
    return harness.db;
  },
  transaction: <T,>(body: (tx: unknown) => Promise<T>) => harness.transaction(body),
}));

// The two leaves of the import graph that reach React Native — see
// transfer.test.ts for why they have to be mocked here.
vi.mock('@/lib/media', () => ({
  copyMedia: () => null,
  deleteMedia: () => {},
  deleteCharacterMedia: () => {},
}));
vi.mock('@/lib/log', () => ({
  log: { debug: () => {}, info: () => {}, warn: () => {}, error: () => {} },
}));

const { createCharacter, deleteCharacter } = await import('@/repositories/characters');
const { createTrait, deleteTrait, traitsQuery, updateTrait } = await import(
  '@/repositories/traits'
);
const { traitPool } = await import('@/lib/trait-pool');

beforeEach(() => {
  harness?.close();
  harness = createTestDb();
});

describe('traits', () => {
  it('returns both kinds from one query, in insertion order', async () => {
    const c = await createCharacter({ nom: 'Aldric' });
    await createTrait(c.id, { kind: 'desavantage', name: 'Phobie', rarity: 'commun', cost: 3 });
    await createTrait(c.id, { kind: 'avantage', name: 'Fortune', rarity: 'commun', cost: 2 });

    const rows = await traitsQuery(c.id);
    expect(rows.map((r) => r.name)).toEqual(['Phobie', 'Fortune']);
    expect(traitPool(rows)).toEqual({ gained: 3, spent: 2, balance: 1 });
  });

  it('defaults a picked trait to a common, note-less, hand-made row', async () => {
    const c = await createCharacter({ nom: 'Aldric' });
    const row = await createTrait(c.id, { kind: 'avantage', name: 'Sens aiguisé' });
    expect(row).toMatchObject({
      rarity: 'commun',
      cost: 0,
      description: '',
      note: '',
      presetId: null,
      presetRevision: null,
    });
  });

  it('keeps a catalogue pick’s provenance and the player’s own note apart', async () => {
    const c = await createCharacter({ nom: 'Aldric' });
    const row = await createTrait(c.id, {
      kind: 'desavantage',
      name: 'Phobie',
      rarity: 'commun',
      cost: 2,
      description: 'Texte du livre de règles.',
      presetId: 'phobie',
      presetRevision: 'abc123',
    });
    await updateTrait(row.id, { note: 'les araignées' });

    const [saved] = await traitsQuery(c.id);
    expect(saved.note).toBe('les araignées');
    expect(saved.description).toBe('Texte du livre de règles.');
    expect(saved.presetId).toBe('phobie');
  });

  it('deletes one trait without touching the others', async () => {
    const c = await createCharacter({ nom: 'Aldric' });
    const first = await createTrait(c.id, { kind: 'desavantage', name: 'Phobie', cost: 3 });
    await createTrait(c.id, { kind: 'desavantage', name: 'Dette', cost: 1 });

    await deleteTrait(first.id);
    expect((await traitsQuery(c.id)).map((r) => r.name)).toEqual(['Dette']);
  });

  it('cascades with the character', async () => {
    const c = await createCharacter({ nom: 'Aldric' });
    await createTrait(c.id, { kind: 'avantage', name: 'Fortune', cost: 2 });

    await deleteCharacter(c.id);
    expect(harness.raw.prepare('SELECT COUNT(*) AS n FROM traits').get()).toEqual({ n: 0 });
  });
});
