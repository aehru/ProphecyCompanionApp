import { describe, expect, it } from 'vitest';

import { MONEY, NUMERIC_KEYS, RESOURCES, SPHERES, WOUND_LEVELS } from '@/constants/prophecy';

import {
  buildExport,
  type CharacterBundle,
  EXPORT_FORMAT,
  parseImport,
  planImport,
  SCHEMA_VERSION,
  serializeExport,
} from './character-transfer';

// A complete, valid bundle. Numeric columns are zeroed from the same constants
// the schema derives from, then a few fields are set to meaningful values so the
// round-trip actually proves data survives.
function makeBundle(over: Partial<CharacterBundle> = {}): CharacterBundle {
  const zeroed = (keys: readonly string[]) =>
    Object.fromEntries(keys.map((k) => [k, 0]));

  const character = {
    nom: 'Ryld',
    concept: 'Épéiste errant',
    biographie: 'Né sous une mauvaise étoile.',
    ...zeroed(NUMERIC_KEYS),
    force: 4,
    volonte: 3,
    physique: 5,
  } as CharacterBundle['character'];

  const state = {
    ...zeroed(WOUND_LEVELS.map((w) => `${w.key}Current`)),
    ...zeroed(RESOURCES.map((r) => `${r.key}Current`)),
    reserveMagiqueCurrent: 0,
    ...zeroed(SPHERES.map((s) => `${s.key}Current`)),
    ...zeroed(MONEY.map((m) => m.key)),
    legereCurrent: 2,
    dracOr: 7,
    initiativeValues: [3, 8],
    conditions: 'Empoisonné',
    notes: 'Doit 5 dracs à Toron.',
  } as CharacterBundle['state'];

  return {
    character,
    state,
    skills: [{ name: 'Esquive', attribut: 'physique', value: 3 }],
    armor: [{ name: 'Cuir clouté', defenseMax: 4, defenseCurrent: 2, equipped: true }],
    weapons: [
      {
        name: 'Épée longue',
        damage: 'FOR x2 +1D10',
        prerequisites: 'FOR 4',
        creationDifficulty: 15,
        creationTime: 3,
        initMelee: 2,
        initCorpsACorps: -1,
        special: '',
        rangeEffective: null,
        rangeMax: null,
        hands: 1,
        equippedHand: 'main',
      },
    ],
    spells: [
      {
        name: 'Bouclier carmin',
        complexity: 15,
        discipline: 'magieInstinctive',
        sphere: 'sphereFeu',
        cost: 3,
        castTimeAmount: 2,
        castTimeUnit: 'action',
        difficulty: 15,
        cle: 'Charbon',
        effect: 'Pare une attaque.',
      },
    ],
    effects: [
      {
        label: 'Bénédiction',
        target: 'all',
        value: 1,
        durationUnit: 'round',
        durationRemaining: 3,
        expired: false,
      },
    ],
    ...over,
  };
}

describe('buildExport', () => {
  it('wraps bundles in the versioned envelope with an ISO timestamp', () => {
    const exp = buildExport([makeBundle()], new Date('2026-01-02T03:04:05.000Z'));
    expect(exp.format).toBe(EXPORT_FORMAT);
    expect(exp.schemaVersion).toBe(SCHEMA_VERSION);
    expect(exp.exportedAt).toBe('2026-01-02T03:04:05.000Z');
    expect(exp.characters).toHaveLength(1);
  });

  it('carries multiple characters', () => {
    const exp = buildExport([makeBundle(), makeBundle({ skills: [] })]);
    expect(exp.characters).toHaveLength(2);
  });
});

describe('round-trip', () => {
  it('serialize → parseImport returns identical data', () => {
    const exp = buildExport([makeBundle()], new Date('2026-01-02T00:00:00.000Z'));
    const json = serializeExport(exp);
    const r = parseImport(json);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data).toEqual(exp);
  });

  it('preserves the meaningful values (not just shape)', () => {
    const json = serializeExport(buildExport([makeBundle()]));
    const r = parseImport(json);
    if (!r.ok) throw new Error(r.error);
    const b = r.data.characters[0];
    // Numeric stat columns are derived keys (not literal in the inferred type);
    // read them through a numeric-record view.
    const char = b.character as unknown as Record<string, number>;
    const st = b.state as unknown as Record<string, number>;
    expect(char.force).toBe(4);
    expect(st.legereCurrent).toBe(2);
    expect(st.dracOr).toBe(7);
    expect(b.state.initiativeValues).toEqual([3, 8]);
    expect(b.weapons[0].damage).toBe('FOR x2 +1D10');
    expect(b.spells[0].discipline).toBe('magieInstinctive');
  });

  it('round-trips an empty roster', () => {
    const json = serializeExport(buildExport([]));
    const r = parseImport(json);
    expect(r.ok && r.data.characters).toEqual([]);
  });
});

describe('parseImport validation', () => {
  it('rejects non-JSON input', () => {
    const r = parseImport('{ not json');
    expect(r.ok).toBe(false);
    expect(!r.ok && r.error).toMatch(/JSON invalide/);
  });

  it('rejects a JSON array (not an object)', () => {
    const r = parseImport('[]');
    expect(r.ok).toBe(false);
    expect(!r.ok && r.error).toMatch(/non reconnu/i);
  });

  it('rejects a foreign file (wrong format tag)', () => {
    const r = parseImport(JSON.stringify({ format: 'something-else', characters: [] }));
    expect(r.ok).toBe(false);
    expect(!r.ok && r.error).toMatch(/n’est pas un export Prophecy/);
  });

  it('rejects an unsupported schema version', () => {
    const r = parseImport(
      JSON.stringify({ format: EXPORT_FORMAT, schemaVersion: 999, exportedAt: '', characters: [] }),
    );
    expect(r.ok).toBe(false);
    expect(!r.ok && r.error).toMatch(/Version d’export non prise en charge/);
  });

  it('rejects a corrupt bundle (missing required fields)', () => {
    const bad = buildExport([makeBundle()]) as unknown as Record<string, unknown>;
    // Drop a required column from the character to simulate corruption.
    const chars = bad.characters as { character: Record<string, unknown> }[];
    delete chars[0].character.force;
    const r = parseImport(JSON.stringify(bad));
    expect(r.ok).toBe(false);
    expect(!r.ok && r.error).toMatch(/corrompu ou incomplet/);
  });

  it('accepts a valid, complete export', () => {
    const r = parseImport(serializeExport(buildExport([makeBundle()])));
    expect(r.ok).toBe(true);
  });

  it('accepts a legacy export whose characters have no uuid', () => {
    const exp = buildExport([makeBundle()]) as unknown as {
      characters: { character: Record<string, unknown> }[];
    };
    // Simulate a v1 file: strip the optional uuid entirely.
    delete exp.characters[0].character.uuid;
    const r = parseImport(JSON.stringify(exp));
    expect(r.ok).toBe(true);
  });

  it('carries an explicit uuid through parse', () => {
    const exp = buildExport([makeBundle({ character: { ...makeBundle().character, uuid: 'abc-123' } })]);
    const r = parseImport(serializeExport(exp));
    expect(r.ok && r.data.characters[0].character.uuid).toBe('abc-123');
  });
});

describe('planImport', () => {
  const mint = () => 'MINTED';

  it('copy always mints a fresh id and inserts, ignoring the incoming uuid', () => {
    expect(planImport('u1', new Set(), 'copy', mint)).toEqual({ uuid: 'MINTED', action: 'insert' });
    expect(planImport('u1', new Set(['u1']), 'copy', mint)).toEqual({
      uuid: 'MINTED',
      action: 'insert',
    });
  });

  it('restore preserves an unknown incoming uuid as an insert', () => {
    expect(planImport('u1', new Set(['other']), 'restore', mint)).toEqual({
      uuid: 'u1',
      action: 'insert',
    });
  });

  it('restore replaces in place when the device already holds the uuid', () => {
    expect(planImport('u1', new Set(['u1']), 'restore', mint)).toEqual({
      uuid: 'u1',
      action: 'replace',
    });
  });

  it('mints a new id when the bundle has no uuid, even in restore mode', () => {
    expect(planImport(undefined, new Set(), 'restore', mint)).toEqual({
      uuid: 'MINTED',
      action: 'insert',
    });
  });
});
