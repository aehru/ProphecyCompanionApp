import { describe, expect, it } from 'vitest';

import type { SpellPreset } from '@/data/spell-catalog';
import {
  planSpellSync,
  syncPatch,
  type SpellSyncEntry,
  type SpellSyncRow,
} from '@/lib/spell-sync';

/** A catalogue preset with only the fields a case cares about. */
function preset(id: string, revision: string, data: Partial<SpellPreset['data']> = {}): SpellPreset {
  return {
    id,
    revision,
    data: {
      name: 'Boule de feu',
      level: 1,
      complexity: 20,
      discipline: 'sorcellerie',
      sphere: 'sphereFeu',
      cost: 5,
      castTimeAmount: 1,
      castTimeUnit: 'action',
      difficulty: 15,
      cle: 'braise',
      effect: 'Une boule de feu.',
      ...data,
    },
  };
}

/** A saved row, defaulted to "exactly what that preset would have inserted". */
function row(over: Partial<SpellSyncRow> = {}): SpellSyncRow {
  return {
    id: 1,
    characterId: 7,
    presetId: 'boule-de-feu',
    presetRevision: 'r1',
    name: 'Boule de feu',
    level: 1,
    complexity: 20,
    discipline: 'sorcellerie',
    sphere: 'sphereFeu',
    dragonOnly: false,
    cost: 5,
    castTimeAmount: 1,
    castTimeUnit: 'action',
    difficulty: 15,
    cle: 'braise',
    effect: 'Une boule de feu.',
    inGameEffect: '',
    sensoryEffect: '',
    duration: '',
    durationUnit: 'round',
    targets: '',
    tags: [],
    ...over,
  } as SpellSyncRow;
}

describe('planSpellSync — what it refuses to touch', () => {
  it('leaves a spell the player wrote alone', () => {
    const plan = planSpellSync([row({ presetId: null, presetRevision: null })], [preset('boule-de-feu', 'r2')]);
    expect(plan).toEqual({ auto: [], conflicts: [] });
  });

  it('leaves a spell whose catalogue entry is gone alone', () => {
    const plan = planSpellSync([row()], [preset('autre-sort', 'r2')]);
    expect(plan).toEqual({ auto: [], conflicts: [] });
  });

  it('ignores a row already stamped at the current revision', () => {
    // Even one whose column was cleared by the player: at this revision the
    // sheet is up to date, and an empty field is then a deletion, not a gap.
    const plan = planSpellSync([row({ presetRevision: 'r2', cle: '' })], [preset('boule-de-feu', 'r2')]);
    expect(plan).toEqual({ auto: [], conflicts: [] });
  });

  it('examines a row picked before revisions existed', () => {
    const plan = planSpellSync(
      [row({ presetRevision: null })],
      [preset('boule-de-feu', 'r2', { effect: 'Une boule de feu corrigée.' })],
    );
    expect(plan.conflicts).toHaveLength(1);
  });
});

describe('planSpellSync — fills', () => {
  it('fills an empty column without asking', () => {
    const plan = planSpellSync([row()], [preset('boule-de-feu', 'r2', { targets: 'NR' })]);
    expect(plan.conflicts).toEqual([]);
    expect(plan.auto).toHaveLength(1);
    expect(plan.auto[0].fills).toEqual({ targets: 'NR' });
    expect(plan.auto[0].revision).toBe('r2');
  });

  it('raises a draconic restriction without asking', () => {
    // `dragonOnly` false is the column default and no editor writes it, so
    // turning it on takes nothing away from the player.
    const plan = planSpellSync([row()], [preset('boule-de-feu', 'r2', { dragonOnly: true })]);
    expect(plan.conflicts).toEqual([]);
    expect(plan.auto[0].fills).toEqual({ dragonOnly: true });
  });

  it('asks before LIFTING a restriction the sheet already carries', () => {
    const plan = planSpellSync([row({ dragonOnly: true })], [preset('boule-de-feu', 'r2')]);
    expect(plan.conflicts[0].conflicts).toEqual([
      { column: 'dragonOnly', mine: true, theirs: false },
    ]);
  });

  it('brings the unit along when it fills a durée', () => {
    const plan = planSpellSync(
      [row()],
      [preset('boule-de-feu', 'r2', { duration: '1 + NR', durationUnit: 'minute' })],
    );
    expect(plan.auto[0].fills).toEqual({ duration: '1 + NR', durationUnit: 'minute' });
  });

  it('fills an empty tag list', () => {
    const plan = planSpellSync([row()], [preset('boule-de-feu', 'r2', { tags: ['attack'] })]);
    expect(plan.auto[0].fills).toEqual({ tags: ['attack'] });
  });

  it('treats 0 as a value, not as a gap', () => {
    const plan = planSpellSync([row({ cost: 0 })], [preset('boule-de-feu', 'r2')]);
    expect(plan.auto).toEqual([]);
    expect(plan.conflicts[0].conflicts).toEqual([{ column: 'cost', mine: 0, theirs: 5 }]);
  });
});

describe('planSpellSync — conflicts', () => {
  it('asks when both sides hold a different value', () => {
    const plan = planSpellSync(
      [row({ effect: 'Ma version.' })],
      [preset('boule-de-feu', 'r2', { effect: 'La version corrigée.' })],
    );
    expect(plan.auto).toEqual([]);
    expect(plan.conflicts[0].conflicts).toEqual([
      { column: 'effect', mine: 'Ma version.', theirs: 'La version corrigée.' },
    ]);
  });

  it('asks when the catalogue CLEARS a value the sheet holds', () => {
    const plan = planSpellSync(
      [row({ targets: '1 + NR' })],
      [preset('boule-de-feu', 'r2')],
    );
    expect(plan.conflicts[0].conflicts).toEqual([
      { column: 'targets', mine: '1 + NR', theirs: '' },
    ]);
  });

  it('reports a unit change on an unchanged durée', () => {
    const plan = planSpellSync(
      [row({ duration: '1 + NR', durationUnit: 'round' })],
      [preset('boule-de-feu', 'r2', { duration: '1 + NR', durationUnit: 'minute' })],
    );
    expect(plan.conflicts[0].conflicts).toEqual([
      { column: 'durationUnit', mine: 'round', theirs: 'minute' },
    ]);
  });

  it('carries fills alongside conflicts on the same spell', () => {
    const plan = planSpellSync(
      [row({ effect: 'Ma version.' })],
      [preset('boule-de-feu', 'r2', { effect: 'Corrigée.', dragonOnly: true })],
    );
    expect(plan.conflicts[0].fills).toEqual({ dragonOnly: true });
    expect(plan.conflicts[0].conflicts).toHaveLength(1);
  });

  it('does not report a reordered tag list', () => {
    const plan = planSpellSync(
      [row({ tags: ['enemy', 'attack'] })],
      [preset('boule-de-feu', 'r2', { tags: ['attack', 'enemy'] })],
    );
    expect(plan.conflicts).toEqual([]);
    expect(plan.auto[0].fills).toEqual({});
  });

  it('never looks at cleParfaite', () => {
    const plan = planSpellSync([row()], [preset('boule-de-feu', 'r2')]);
    expect(JSON.stringify(plan)).not.toContain('cleParfaite');
  });
});

describe('syncPatch', () => {
  const entry: SpellSyncEntry = {
    spellId: 3,
    characterId: 7,
    name: 'Boule de feu',
    presetId: 'boule-de-feu',
    revision: 'r2',
    fills: { dragonOnly: true },
    conflicts: [{ column: 'effect', mine: 'Ma version.', theirs: 'Corrigée.' }],
  };

  it('stamps the revision and applies the fills when declined', () => {
    expect(syncPatch(entry, false)).toEqual({ dragonOnly: true, presetRevision: 'r2' });
  });

  it('takes the catalogue values when accepted', () => {
    expect(syncPatch(entry, true)).toEqual({
      dragonOnly: true,
      effect: 'Corrigée.',
      presetRevision: 'r2',
    });
  });
});
