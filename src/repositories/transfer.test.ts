// The export/import round trip, against a REAL migrated database.
//
// `lib/character-transfer.test.ts` covers the envelope's pure half (validation,
// import planning, enchant link resolution). This covers the half that talks to
// SQLite: that a bundle assembled from N characters at once carries the same
// rows — in the same ORDER — that a per-character walk produced, because an
// enchant's target travels as a POSITION into its sibling array and a reordered
// export binds it to the wrong sword.

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createTestDb, type TestDb } from '@/repositories/test-db';

let harness: TestDb;

// The repositories import the app's singleton; hand them the test database
// instead. `vi.mock` is hoisted, so the getters defer to `harness` at call time.
vi.mock('@/db/client', () => ({
  get db() {
    return harness.db;
  },
  transaction: <T,>(body: (tx: unknown) => Promise<T>) => harness.transaction(body),
}));

// Two leaves of the import graph reach React Native (expo-file-system, the
// platform log sink, AsyncStorage) and cannot load under Node. Neither is what
// this file is about: media lives on the filesystem, not in the bundle, and the
// log is write-only here.
vi.mock('@/lib/media', () => ({
  copyMedia: () => null,
  deleteMedia: () => {},
  deleteCharacterMedia: () => {},
}));
vi.mock('@/lib/log', () => ({
  log: { debug: () => {}, info: () => {}, warn: () => {}, error: () => {} },
}));

const { createCharacter } = await import('@/repositories/characters');
const { createWeapon } = await import('@/repositories/weapons');
const { createSpell } = await import('@/repositories/spells');
const { createEnchant } = await import('@/repositories/enchants');
const { createTrait } = await import('@/repositories/traits');
const { exportCharacters, importCharacters } = await import('@/repositories/transfer');

beforeEach(() => {
  harness?.close();
  harness = createTestDb();
});

/** A character with `count` weapons, named so their order is checkable. */
async function seedCharacter(nom: string, weaponNames: string[]) {
  const c = await createCharacter({ nom, force: 4, volonte: 3 });
  const weapons = [];
  for (const name of weaponNames) weapons.push(await createWeapon(c.id, { name }));
  return { character: c, weapons };
}

describe('createCharacter', () => {
  it('creates the state row with the sheet, in one transaction', async () => {
    const c = await createCharacter({ nom: 'Aldric', maitriseMax: 5, chanceMax: 2 });
    const state = harness.raw
      .prepare('SELECT * FROM actual_state WHERE character_id = ?')
      .get(c.id) as { maitrise_current: number; chance_current: number } | undefined;
    expect(state).toBeDefined();
    // Pools start full — a fresh character isn't created empty.
    expect(state?.maitrise_current).toBe(5);
    expect(state?.chance_current).toBe(2);
  });
});

describe('exportCharacters', () => {
  it('keeps each character with its own children', async () => {
    const a = await seedCharacter('Aldric', ['Épée', 'Dague']);
    const b = await seedCharacter('Brahim', ['Arc']);

    const exp = await exportCharacters([a.character.id, b.character.id]);
    const byName = new Map(exp.characters.map((x) => [(x.character as { nom: string }).nom, x]));
    expect(byName.get('Aldric')?.weapons.map((w) => (w as { name: string }).name)).toEqual([
      'Épée',
      'Dague',
    ]);
    expect(byName.get('Brahim')?.weapons.map((w) => (w as { name: string }).name)).toEqual(['Arc']);
  });

  it('orders each character’s children by id, which is what enchant links index into', async () => {
    const { character, weapons } = await seedCharacter('Aldric', ['A', 'B', 'C', 'D']);
    // Bind an enchant to the THIRD weapon; it must survive as index 2.
    await createEnchant(character.id, 'weapon', weapons[2].id, { name: 'Flamme' });

    const exp = await exportCharacters([character.id]);
    const bundle = exp.characters[0];
    expect(bundle.weapons.map((w) => (w as { name: string }).name)).toEqual(['A', 'B', 'C', 'D']);
    expect(bundle.enchants?.[0].targetIndex).toBe(2);
    expect(bundle.enchants?.[0].targetType).toBe('weapon');
  });

  it('exports the whole roster when no ids are given, and nothing for an empty list', async () => {
    await seedCharacter('Aldric', ['Épée']);
    await seedCharacter('Brahim', []);
    expect((await exportCharacters()).characters).toHaveLength(2);
    // An empty selection is not "everything" — `inArray(id, [])` is invalid SQL.
    expect((await exportCharacters([])).characters).toHaveLength(0);
  });
});

describe('export → import round trip', () => {
  it('carries both halves of the point pool onto the copy', async () => {
    const { character } = await seedCharacter('Aldric', []);
    await createTrait(character.id, {
      kind: 'desavantage',
      name: 'Phobie',
      rarity: 'commun',
      cost: 3,
      description: 'Peur irraisonnée.',
      inGameEffect: 'Difficulté augmentée de 5.',
      note: 'les araignées',
      presetId: 'phobie',
      presetRevision: 'abc123def456',
    });
    await createTrait(character.id, { kind: 'avantage', name: 'Fortune', cost: 2 });

    const { ids } = await importCharacters(await exportCharacters([character.id]), 'copy');
    const rows = harness.raw
      .prepare(
        'SELECT kind, name, cost, in_game_effect, note, preset_id FROM traits WHERE character_id = ? ORDER BY id',
      )
      .all(ids[0]);
    expect(rows).toEqual([
      {
        kind: 'desavantage',
        name: 'Phobie',
        cost: 3,
        in_game_effect: 'Difficulté augmentée de 5.',
        note: 'les araignées',
        preset_id: 'phobie',
      },
      { kind: 'avantage', name: 'Fortune', cost: 2, in_game_effect: '', note: '', preset_id: null },
    ]);
  });

  it('rebuilds an enchant against the right weapon after re-insertion', async () => {
    const { character, weapons } = await seedCharacter('Aldric', ['A', 'B', 'C', 'D']);
    await createEnchant(character.id, 'weapon', weapons[2].id, { name: 'Flamme' });

    const exp = await exportCharacters([character.id]);
    const { ids } = await importCharacters(exp, 'copy');
    const copyId = ids[0];
    expect(copyId).not.toBe(character.id);

    // The copy's enchant must point at the copy's own 'C', not at any original
    // row and not at whatever id happened to land at that position.
    const bound = harness.raw
      .prepare(
        `SELECT w.name AS name, w.character_id AS owner
           FROM enchants e JOIN weapons w ON w.id = e.target_id
          WHERE e.character_id = ?`,
      )
      .get(copyId) as { name: string; owner: number } | undefined;
    expect(bound?.name).toBe('C');
    expect(bound?.owner).toBe(copyId);
  });

  it('carries an enchant’s source spell across as a position too', async () => {
    const { character, weapons } = await seedCharacter('Aldric', ['Épée']);
    await createSpell(character.id, { name: 'Trait de feu', known: true });
    const source = await createSpell(character.id, { name: 'Gel', known: false });
    await createEnchant(character.id, 'weapon', weapons[0].id, {
      name: 'Gel',
      sourceSpellId: source.id,
      sourceSpellName: 'Gel',
    });

    const { ids } = await importCharacters(await exportCharacters([character.id]), 'copy');
    const bound = harness.raw
      .prepare(
        `SELECT s.name AS name FROM enchants e JOIN spells s ON s.id = e.source_spell_id
          WHERE e.character_id = ?`,
      )
      .get(ids[0]) as { name: string } | undefined;
    expect(bound?.name).toBe('Gel');
  });

  it('restores a character in place on its uuid instead of duplicating it', async () => {
    const { character } = await seedCharacter('Aldric', ['Épée']);
    const exp = await exportCharacters([character.id], 'backup');
    const { ids, restored } = await importCharacters(exp, 'restore');
    expect(restored).toBe(1);
    expect(ids[0]).toBe(character.id);
    expect(harness.raw.prepare('SELECT COUNT(*) AS n FROM characters').get()).toEqual({ n: 1 });
    // And the children were rebuilt, not doubled.
    expect(harness.raw.prepare('SELECT COUNT(*) AS n FROM weapons').get()).toEqual({ n: 1 });
  });

  it('lands a shared export as a new lineage even when a restore was asked for', async () => {
    const { character } = await seedCharacter('Aldric', ['Épée']);
    // A partage strips the uuid, so the file itself decides: copy, not restore.
    const exp = await exportCharacters([character.id], 'share');
    const { ids, restored } = await importCharacters(exp, 'restore');
    expect(restored).toBe(0);
    expect(ids[0]).not.toBe(character.id);
    expect(harness.raw.prepare('SELECT COUNT(*) AS n FROM characters').get()).toEqual({ n: 2 });
  });

  it('round-trips several characters at once without crossing their children', async () => {
    const a = await seedCharacter('Aldric', ['Épée', 'Dague']);
    await seedCharacter('Brahim', ['Arc']);
    await createEnchant(a.character.id, 'weapon', a.weapons[1].id, { name: 'Flamme' });

    const { ids } = await importCharacters(await exportCharacters(), 'copy');
    expect(ids).toHaveLength(2);
    const rows = harness.raw
      .prepare(
        `SELECT c.nom AS nom, COUNT(w.id) AS weapons
           FROM characters c LEFT JOIN weapons w ON w.character_id = c.id
          WHERE c.id IN (?, ?) GROUP BY c.id ORDER BY c.nom`,
      )
      .all(ids[0], ids[1]);
    // No « (copie) » suffix: that is `duplicateCharacter`'s doing, not the
    // importer's — a plain copy-mode import keeps the names it was given.
    expect(rows).toEqual([
      { nom: 'Aldric', weapons: 2 },
      { nom: 'Brahim', weapons: 1 },
    ]);
    // The copied enchant follows Aldric's second weapon, not Brahim's only one.
    const bound = harness.raw
      .prepare(
        `SELECT w.name AS name FROM enchants e JOIN weapons w ON w.id = e.target_id
          WHERE e.character_id = ?`,
      )
      .all(ids[0]);
    expect(bound).toEqual([{ name: 'Dague' }]);
  });
});
