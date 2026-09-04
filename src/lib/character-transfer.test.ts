import { describe, expect, it } from 'vitest';

import { MONEY, NUMERIC_KEYS, RESOURCES, SPHERES, WOUND_LEVELS } from '@/constants/prophecy';

import {
  buildExport,
  bundleMode,
  type CharacterBundle,
  EXPORT_FORMAT,
  exportFileName,
  forSharing,
  linkEnchant,
  parseImport,
  planImport,
  planMagicReserves,
  resolveEnchantLinks,
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
    items: [{ name: 'Corde de chanvre', description: '10 mètres', quantity: 1, equipped: false }],
    magicReserves: [{ nom: 'Gemme de vent', max: 5, current: 2 }],
    // Bound to the weapon above (index 0) and sourced from the spell above
    // (index 0) — the positional links an export carries instead of ids.
    enchants: [
      {
        targetType: 'weapon',
        targetIndex: 0,
        name: 'Morsure ardente',
        effect: 'Pare une attaque.',
        usesMax: 3,
        usesCurrent: 1,
        sourceSpellName: 'Bouclier carmin',
        sourceSpellIndex: 0,
        castScore: 22,
        difficulty: 15,
      },
    ],
    traits: [
      {
        kind: 'desavantage',
        name: 'Phobie',
        rarity: 'commun',
        cost: 2,
        description: 'Peur irraisonnée.',
        inGameEffect: 'Difficulté augmentée de 5 face à la peur choisie.',
        note: 'les araignées',
        presetId: 'phobie',
        presetRevision: 'abc123def456',
      },
      {
        kind: 'avantage',
        name: 'Fortune',
        rarity: 'commun',
        cost: 2,
        description: 'Naissance aisée.',
        note: '',
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

  it('round-trips temporary initiative dice, and imports exports made without them', () => {
    const withBonus = makeBundle();
    const st = withBonus.state as unknown as Record<string, unknown>;
    st.initiativeBonusDice = 1;
    st.initiativeDiceIcons = ['sword', '', 'magic'];
    const r = parseImport(serializeExport(buildExport([withBonus])));
    if (!r.ok) throw new Error(r.error);
    const back = r.data.characters[0].state as unknown as Record<string, unknown>;
    expect(back.initiativeBonusDice).toBe(1);
    expect(back.initiativeDiceIcons).toEqual(['sword', '', 'magic']);

    // The base fixture carries no such key — the shape a pre-column export has.
    // It must still import (the column then falls back to its default 0).
    const old = parseImport(serializeExport(buildExport([makeBundle()])));
    expect(old.ok).toBe(true);
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

  it('round-trips an enchantment: its positional links and the enchanter’s roll', () => {
    const r = parseImport(serializeExport(buildExport([makeBundle()])));
    if (!r.ok) throw new Error(r.error);
    const e = r.data.characters[0].enchants[0];
    // The links travel as positions, never as ids — the ids don't survive.
    expect(e).toMatchObject({
      targetType: 'weapon',
      targetIndex: 0,
      sourceSpellIndex: 0,
      castScore: 22,
      difficulty: 15,
    });
    expect(r.data.characters[0].items[0]).toEqual({
      name: 'Corde de chanvre',
      description: '10 mètres',
      quantity: 1,
      equipped: false,
    });
  });

  it('round-trips a sortilège known only as an enchantment’s source', () => {
    const bundle = makeBundle();
    (bundle.spells[0] as { known?: boolean }).known = false;
    const r = parseImport(serializeExport(buildExport([bundle])));
    if (!r.ok) throw new Error(r.error);
    expect(r.data.characters[0].spells[0].known).toBe(false);
  });

  it('imports a file written before items and enchantments existed', () => {
    // Exactly the shape an older export has: the two keys are simply absent.
    const exp = buildExport([makeBundle()]) as unknown as {
      characters: Record<string, unknown>[];
    };
    delete exp.characters[0].items;
    delete exp.characters[0].enchants;
    const r = parseImport(serializeExport(exp as never));
    if (!r.ok) throw new Error(r.error);
    expect(r.data.characters[0].items).toEqual([]);
    expect(r.data.characters[0].enchants).toEqual([]);
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

  it('carries the avantages and désavantages through parse, provenance included', () => {
    const r = parseImport(serializeExport(buildExport([makeBundle()])));
    if (!r.ok) throw new Error(r.error);
    expect(r.data.characters[0].traits).toEqual([
      {
        kind: 'desavantage',
        name: 'Phobie',
        rarity: 'commun',
        cost: 2,
        description: 'Peur irraisonnée.',
        inGameEffect: 'Difficulté augmentée de 5 face à la peur choisie.',
        // The player's own note and the rulebook paragraph travel apart, so a
        // later catalogue correction can rewrite one without touching the other.
        note: 'les araignées',
        presetId: 'phobie',
        presetRevision: 'abc123def456',
      },
      {
        kind: 'avantage',
        name: 'Fortune',
        rarity: 'commun',
        cost: 2,
        description: 'Naissance aisée.',
        note: '',
      },
    ]);
  });

  it('accepts an export predating the traits table (defaults to none)', () => {
    const exp = buildExport([makeBundle()]) as unknown as {
      characters: Record<string, unknown>[];
    };
    delete exp.characters[0].traits;
    const r = parseImport(JSON.stringify(exp));
    expect(r.ok && r.data.characters[0].traits).toEqual([]);
  });

  it('rejects a trait whose kind names neither side of the pool', () => {
    // The one strict field: defaulting an unknown kind would move the cost to
    // the wrong half of the balance rather than fail.
    const exp = buildExport([makeBundle()]) as unknown as {
      characters: { traits: Record<string, unknown>[] }[];
    };
    exp.characters[0].traits[0].kind = 'privilege';
    expect(parseImport(JSON.stringify(exp)).ok).toBe(false);
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

  it('accepts a character without caste (export predating the column)', () => {
    const r = parseImport(serializeExport(buildExport([makeBundle()])));
    expect(r.ok).toBe(true);
    // Absent, not null: the column defaults to NULL, which IS « Sans Caste ».
    expect(r.ok && r.data.characters[0].character.caste).toBeUndefined();
  });

  it('carries a caste through parse', () => {
    const b = makeBundle();
    const exp = buildExport([{ ...b, character: { ...b.character, caste: 'erudit' } }]);
    const r = parseImport(serializeExport(exp));
    expect(r.ok && r.data.characters[0].character.caste).toBe('erudit');
  });

  it('folds a hand-written caste onto its key, and drops one it cannot place', () => {
    // Why casteFromInput sits in the schema rather than at the call site: a
    // backup edited by hand says « Érudit », not `erudit`. An unrecognized one
    // imports as « Sans Caste » — losing a label must never cost the sheet.
    const b = makeBundle();
    const withCaste = (caste: string) =>
      buildExport([
        { ...b, character: { ...b.character, caste } as CharacterBundle['character'] },
      ]);

    const accented = parseImport(serializeExport(withCaste('Érudit')));
    expect(accented.ok && accented.data.characters[0].character.caste).toBe('erudit');

    const unknown = parseImport(serializeExport(withCaste('Chevalier')));
    expect(unknown.ok).toBe(true);
    expect(unknown.ok && unknown.data.characters[0].character.caste).toBeNull();
  });
  it('carries an explicit uuid through parse', () => {
    const exp = buildExport([makeBundle({ character: { ...makeBundle().character, uuid: 'abc-123' } })]);
    const r = parseImport(serializeExport(exp));
    expect(r.ok && r.data.characters[0].character.uuid).toBe('abc-123');
  });
});

// The one piece of this feature with a decision in it. Both halves live in the
// repository's transaction, so these pure functions are the only place the
// drop-vs-degrade rule can be pinned down at all.
describe('linkEnchant / resolveEnchantLinks', () => {
  const gearIndex = () => ({
    weapon: new Map([[70, 0], [71, 1]]),
    armor: new Map([[80, 0]]),
    shield: new Map<number, number>(),
    item: new Map([[90, 0]]),
  });
  const spellIndex = new Map([[10, 0], [11, 1]]);

  it('writes the position, not the id — and reads the id back out of it', () => {
    const links = linkEnchant(
      { targetType: 'weapon', targetId: 71, sourceSpellId: 11 },
      gearIndex(),
      spellIndex,
    );
    expect(links).toEqual({ targetIndex: 1, sourceSpellIndex: 1 });
    // The far side has different ids for the same positions — that IS the point.
    expect(resolveEnchantLinks({ targetType: 'weapon', ...links! }, { weapon: [500, 501] }, [600, 601]))
      .toEqual({ targetId: 501, sourceSpellId: 601 });
  });

  it('indexes each kind against its OWN array', () => {
    // Id 70 is a weapon at position 0; nothing in `armor` has that id, so an
    // armor-typed enchant pointing at it must not silently take the weapon's slot.
    expect(linkEnchant({ targetType: 'armor', targetId: 70, sourceSpellId: null }, gearIndex(), spellIndex))
      .toBeNull();
    // And on the way back: position 0 means a different row per kind.
    const ids = { weapon: [500], armor: [800] };
    expect(resolveEnchantLinks({ targetType: 'armor', targetIndex: 0 }, ids, []))
      .toEqual({ targetId: 800, sourceSpellId: null });
  });

  it('DROPS an enchant whose object is gone, either way round', () => {
    expect(linkEnchant({ targetType: 'shield', targetId: 5, sourceSpellId: null }, gearIndex(), spellIndex))
      .toBeNull();
    // A file naming a kind this bundle has no rows for, or a position past the
    // end of one it does — never bind to whatever else sits there.
    expect(resolveEnchantLinks({ targetType: 'shield', targetIndex: 0 }, { weapon: [500] }, [])).toBeNull();
    expect(resolveEnchantLinks({ targetType: 'weapon', targetIndex: 3 }, { weapon: [500] }, [])).toBeNull();
  });

  it('DEGRADES a missing source to null instead, keeping the enchant', () => {
    // The spell was deleted under it (`on delete set null`) — the enchant still
    // means something: its name and effect are a frozen snapshot.
    expect(linkEnchant({ targetType: 'weapon', targetId: 70, sourceSpellId: 999 }, gearIndex(), spellIndex))
      .toEqual({ targetIndex: 0, sourceSpellIndex: null });
    expect(resolveEnchantLinks({ targetType: 'weapon', targetIndex: 0, sourceSpellIndex: 4 }, { weapon: [500] }, [600]))
      .toEqual({ targetId: 500, sourceSpellId: null });
  });

  it('keeps position 0 and a source of 0 — neither is "absent"', () => {
    // The falsy trap: index 0 is a real position and id 0 would be a real id.
    expect(linkEnchant({ targetType: 'item', targetId: 90, sourceSpellId: 10 }, gearIndex(), spellIndex))
      .toEqual({ targetIndex: 0, sourceSpellIndex: 0 });
    expect(resolveEnchantLinks({ targetType: 'item', targetIndex: 0, sourceSpellIndex: 0 }, { item: [900] }, [1000]))
      .toEqual({ targetId: 900, sourceSpellId: 1000 });
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
