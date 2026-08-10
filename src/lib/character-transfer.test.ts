import { describe, expect, it } from 'vitest';

import { MONEY, NUMERIC_KEYS, RESOURCES, SPHERES, WOUND_LEVELS } from '@/constants/prophecy';

import {
  buildExport,
  bundleMode,
  type CharacterBundle,
  EXPORT_FORMAT,
  exportFileName,
  forSharing,
  parseImport,
  planImport,
  planMagicReserves,
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
    armor: [
      {
        name: 'Cuir clouté',
        defenseMax: 4,
        defenseCurrent: 2,
        equipped: true,
        category: 'Armures légères',
        prerequisites: '',
        creationDifficulty: 10,
        creationTime: 2,
        special: '',
        encombrementMalus: 0,
      },
    ],
    shields: [
      {
        name: 'Écu de fer',
        damage: 'FOR + 2',
        prerequisites: '',
        creationDifficulty: 10,
        creationTime: 2,
        special: '',
        defenseMax: 2,
        defenseCurrent: 2,
        encombrementMalus: 0,
        equipped: true,
      },
    ],
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
        skillName: 'Armes tranchantes',
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
    magicReserves: [{ nom: 'Gemme de vent', max: 5, current: 2 }],
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

  it('round-trips a permanent effect and a minute-lasting one', () => {
    const bundle = makeBundle({
      effects: [
        { label: 'Anneau', target: 'all', value: 2, durationUnit: 'permanent', durationRemaining: 0, expired: false },
        { label: 'Camouflage', target: 'discretion', value: 5, durationUnit: 'minute', durationRemaining: 30, expired: false },
      ],
    });
    const r = parseImport(serializeExport(buildExport([bundle])));
    if (!r.ok) throw new Error(r.error);
    expect(r.data.characters[0].effects.map((e) => e.durationUnit)).toEqual(['permanent', 'minute']);
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

  it('accepts a spell without cleParfaite (export predating the column)', () => {
    const r = parseImport(serializeExport(buildExport([makeBundle()])));
    expect(r.ok && r.data.characters[0].spells[0].cleParfaite).toBeUndefined();
  });

  it('carries a perfect key through parse', () => {
    const b = makeBundle();
    const exp = buildExport([{ ...b, spells: [{ ...b.spells[0], cleParfaite: true }] }]);
    const r = parseImport(serializeExport(exp));
    expect(r.ok && r.data.characters[0].spells[0].cleParfaite).toBe(true);
  });

  it('carries a fractional weapon creation time through parse', () => {
    const b = makeBundle();
    const exp = buildExport([{ ...b, weapons: [{ ...b.weapons[0], creationTime: 0.5 }] }]);
    const r = parseImport(serializeExport(exp));
    expect(r.ok && r.data.characters[0].weapons[0].creationTime).toBe(0.5);
  });

  it('carries a weapon’s compétence through parse', () => {
    const r = parseImport(serializeExport(buildExport([makeBundle()])));
    expect(r.ok && r.data.characters[0].weapons[0].skillName).toBe('Armes tranchantes');
  });

  it('accepts a weapon predating skillName (export from before the column existed)', () => {
    const b = makeBundle();
    const { skillName: _dropped, ...legacyWeapon } = b.weapons[0];
    const exp = buildExport([{ ...b, weapons: [legacyWeapon] as never }]);
    const r = parseImport(serializeExport(exp));
    expect(r.ok).toBe(true);
    // Imports with no compétence — the same « non définie » state a hand-made
    // weapon starts in, not a failure.
    expect(r.ok && r.data.characters[0].weapons[0].skillName).toBeUndefined();
  });

  it('accepts a spell without level (export predating the column)', () => {
    const r = parseImport(serializeExport(buildExport([makeBundle()])));
    expect(r.ok && r.data.characters[0].spells[0].level).toBeUndefined();
  });

  it('carries a spell level through parse', () => {
    const b = makeBundle();
    const exp = buildExport([{ ...b, spells: [{ ...b.spells[0], level: 3 }] }]);
    const r = parseImport(serializeExport(exp));
    expect(r.ok && r.data.characters[0].spells[0].level).toBe(3);
  });

  it('carries magic reserve objects through parse', () => {
    const r = parseImport(serializeExport(buildExport([makeBundle()])));
    if (!r.ok) throw new Error(r.error);
    expect(r.data.characters[0].magicReserves).toEqual([
      { nom: 'Gemme de vent', max: 5, current: 2 },
    ]);
  });

  it('accepts an export predating the magic reserve table (defaults to none)', () => {
    const exp = buildExport([makeBundle()]) as unknown as {
      characters: Record<string, unknown>[];
    };
    delete exp.characters[0].magicReserves;
    const r = parseImport(JSON.stringify(exp));
    expect(r.ok && r.data.characters[0].magicReserves).toEqual([]);
  });

  it('accepts an export predating the shields table (defaults to none)', () => {
    const exp = buildExport([makeBundle()]) as unknown as {
      characters: Record<string, unknown>[];
    };
    delete exp.characters[0].shields;
    const r = parseImport(JSON.stringify(exp));
    expect(r.ok && r.data.characters[0].shields).toEqual([]);
  });

  it('carries a shield through parse', () => {
    const r = parseImport(serializeExport(buildExport([makeBundle()])));
    expect(r.ok && r.data.characters[0].shields[0].damage).toBe('FOR + 2');
  });

  it('accepts armor predating category/prerequisites/creation/encombrement (export from before those columns existed)', () => {
    const b = makeBundle();
    const legacyArmor = { name: 'Cuir clouté', defenseMax: 4, defenseCurrent: 2, equipped: true };
    const exp = buildExport([{ ...b, armor: [legacyArmor] as never }]);
    const r = parseImport(serializeExport(exp));
    expect(r.ok).toBe(true);
    expect(r.ok && r.data.characters[0].armor[0].category).toBeUndefined();
  });

  it('carries the new armor fields through parse', () => {
    const r = parseImport(serializeExport(buildExport([makeBundle()])));
    expect(r.ok && r.data.characters[0].armor[0].category).toBe('Armures légères');
    expect(r.ok && r.data.characters[0].armor[0].encombrementMalus).toBe(0);
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

describe('planMagicReserves', () => {
  const rows = [
    { nom: 'Gemme', max: 5, current: 2 },
    { nom: 'Bâton', max: 3, current: 0 },
  ];

  it('restore keeps the spent puces', () => {
    expect(planMagicReserves(rows, 'restore')).toEqual(rows);
  });

  it('copy recharges every object to full', () => {
    expect(planMagicReserves(rows, 'copy')).toEqual([
      { nom: 'Gemme', max: 5, current: 5 },
      { nom: 'Bâton', max: 3, current: 3 },
    ]);
  });

  it('never mutates the input rows', () => {
    planMagicReserves(rows, 'copy');
    expect(rows[0].current).toBe(2);
  });
});

describe('forSharing', () => {
  // The whole point of issue #43: a shared file must not carry the identity, or
  // the recipient's device claims the sender's campaign roster slot.
  it('drops the uuid from every character', () => {
    const exp = buildExport([
      makeBundle({ character: { ...makeBundle().character, uuid: 'u1' } as CharacterBundle['character'] }),
      makeBundle({ character: { ...makeBundle().character, uuid: 'u2' } as CharacterBundle['character'] }),
    ]);
    const shared = forSharing(exp);
    for (const b of shared.characters) {
      expect('uuid' in (b.character as object)).toBe(false);
    }
    // Everything else survives, and the source envelope is untouched.
    expect(shared.characters[0].character.nom).toBe('Ryld');
    expect((exp.characters[0].character as { uuid?: string }).uuid).toBe('u1');
  });

  it('leaves an already anonymous export alone', () => {
    const exp = buildExport([makeBundle()]);
    expect(forSharing(exp)).toEqual(exp);
  });

  it('survives the round-trip it is meant for', () => {
    const shared = forSharing(buildExport([makeBundle({
      character: { ...makeBundle().character, uuid: 'u1' } as CharacterBundle['character'],
    })]));
    const parsed = parseImport(serializeExport(shared));
    expect(parsed.ok).toBe(true);
  });
});

describe('exportFileName', () => {
  const at = new Date('2026-08-10T12:00:00Z');
  const named = (nom: string) =>
    makeBundle({ character: { ...makeBundle().character, nom } as CharacterBundle['character'] });

  it('says which intent it is, and names a lone character', () => {
    const exp = buildExport([named('Ryld')]);
    expect(exportFileName(exp, 'backup', at)).toBe('prophecy-sauvegarde-ryld-2026-08-10.json');
    expect(exportFileName(exp, 'share', at)).toBe('prophecy-partage-ryld-2026-08-10.json');
  });

  it('counts a batch instead of naming it', () => {
    const exp = buildExport([named('Ryld'), named('Alia')]);
    expect(exportFileName(exp, 'backup', at)).toBe('prophecy-sauvegarde-2-personnages-2026-08-10.json');
  });

  it('slugifies a name that would be hostile to a filesystem', () => {
    const exp = buildExport([named('Élénaïs / "la Rusée"')]);
    expect(exportFileName(exp, 'share', at)).toBe('prophecy-partage-elenais-la-rusee-2026-08-10.json');
  });

  it('falls back when the name is empty or all punctuation', () => {
    expect(exportFileName(buildExport([named('')]), 'backup', at)).toBe(
      'prophecy-sauvegarde-personnage-2026-08-10.json',
    );
    expect(exportFileName(buildExport([named('???')]), 'backup', at)).toBe(
      'prophecy-sauvegarde-personnage-2026-08-10.json',
    );
  });
});

describe('bundleMode', () => {
  // A restore is only a restore for the bundles that still have an identity.
  it('keeps restore when the bundle carries a uuid', () => {
    expect(bundleMode('u1', 'restore')).toBe('restore');
  });

  it('falls back to copy for a shared (uuid-less) bundle', () => {
    expect(bundleMode(undefined, 'restore')).toBe('copy');
  });

  it('never upgrades a copy import', () => {
    expect(bundleMode('u1', 'copy')).toBe('copy');
  });
});
