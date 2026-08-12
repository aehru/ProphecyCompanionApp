import { describe, expect, it } from 'vitest';

import { NUMERIC_KEYS, RESOURCES, SPHERES, WOUND_LEVELS } from '@/constants/prophecy';
import type { ActualState, Character, Effect, Skill } from '@/db/schema';

import { sharedCharacterSchema, toSharedCharacter } from './character-share';

// Build a full, zeroed character row so the projection never sees `undefined`.
function makeCharacter(over: Record<string, unknown> = {}): Character {
  const base: Record<string, unknown> = {
    id: 1,
    nom: '',
    concept: '',
    biographie: '',
    avatarPath: null,
    portraitPath: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  for (const k of NUMERIC_KEYS) base[k] = 0;
  return { ...base, ...over } as unknown as Character;
}

// Build a full, zeroed actual_state row.
function makeState(over: Record<string, unknown> = {}): ActualState {
  const base: Record<string, unknown> = {
    id: 1,
    characterId: 1,
    conditions: '',
    notes: '',
    initiativeValues: [],
    dracFer: 0,
    dracBronze: 0,
    dracArgent: 0,
    dracOr: 0,
    reserveMagiqueCurrent: 0,
    updatedAt: new Date(),
  };
  for (const w of WOUND_LEVELS) base[`${w.key}Current`] = 0;
  for (const r of RESOURCES) base[`${r.key}Current`] = 0;
  for (const s of SPHERES) base[`${s.key}Current`] = 0;
  return { ...base, ...over } as unknown as ActualState;
}

function makeSkill(over: Partial<Skill> = {}): Skill {
  return {
    id: 1,
    characterId: 1,
    name: '',
    attribut: '',
    value: 0,
    parentName: null,
    specLabel: null,
    ...over,
  } as Skill;
}

function makeEffect(over: Partial<Effect> = {}): Effect {
  return {
    id: 1,
    characterId: 1,
    label: '',
    target: 'all',
    value: 0,
    durationUnit: 'round',
    durationRemaining: 0,
    expired: false,
    createdAt: new Date(),
    ...over,
  } as Effect;
}

describe('toSharedCharacter', () => {
  it('uses nom as the roster label', () => {
    const shared = toSharedCharacter(makeCharacter({ nom: 'Kael' }), makeState());
    expect(shared.nom).toBe('Kael');
  });

  it('maps caractéristiques and attributs from the sheet', () => {
    const shared = toSharedCharacter(
      makeCharacter({ force: 4, empathie: 2, physique: 5, social: 1 }),
      makeState(),
    );
    expect(shared.caracteristiques.force).toBe(4);
    expect(shared.caracteristiques.empathie).toBe(2);
    expect(shared.attributs.physique).toBe(5);
    expect(shared.attributs.social).toBe(1);
  });

  it('maps tendances including the 0–10 subnumbers', () => {
    const shared = toSharedCharacter(
      makeCharacter({ dragon: 2, dragonSub: 7, homme: 1, hommeSub: 3 }),
      makeState(),
    );
    expect(shared.tendances.dragon).toBe(2);
    expect(shared.tendances.dragonSub).toBe(7);
    expect(shared.tendances.homme).toBe(1);
    expect(shared.tendances.hommeSub).toBe(3);
  });

  it('pairs wound current (state) with wound max (sheet)', () => {
    const shared = toSharedCharacter(
      makeCharacter({ graveMax: 5, egratignureMax: 3 }),
      makeState({ graveCurrent: 2, egratignureCurrent: 3 }),
    );
    expect(shared.wounds.grave).toEqual({ current: 2, max: 5 });
    expect(shared.wounds.egratignure).toEqual({ current: 3, max: 3 });
  });

  it('pairs resource current (state) with resource max (sheet)', () => {
    const shared = toSharedCharacter(
      makeCharacter({ maitriseMax: 6, chanceMax: 4 }),
      makeState({ maitriseCurrent: 1, chanceCurrent: 4 }),
    );
    expect(shared.resources.maitrise).toEqual({ current: 1, max: 6 });
    expect(shared.resources.chance).toEqual({ current: 4, max: 4 });
  });

  it('maps initiative max (sheet) and current values (state)', () => {
    const shared = toSharedCharacter(
      makeCharacter({ initiativeMax: 3 }),
      makeState({ initiativeValues: [12, 7, 4] }),
    );
    expect(shared.initiative).toEqual({ max: 3, values: [12, 7, 4] });
  });

  it('ships the EFFECTIVE dice count — temporary dice included, not as a field', () => {
    const shared = toSharedCharacter(
      makeCharacter({ initiativeMax: 2 }),
      makeState({ initiativeBonusDice: 1, initiativeValues: [9, 5, 2] }),
    );
    // The GM sees three dice, with no way to tell the temporary one apart.
    expect(shared.initiative).toEqual({ max: 3, values: [9, 5, 2] });
    expect(shared.initiative).not.toHaveProperty('bonus');
  });

  it('never ships a negative dice count', () => {
    const shared = toSharedCharacter(
      makeCharacter({ initiativeMax: 1 }),
      makeState({ initiativeBonusDice: -4 }),
    );
    expect(shared.initiative.max).toBe(0);
  });

  it('passes conditions through', () => {
    const shared = toSharedCharacter(makeCharacter(), makeState({ conditions: 'À terre' }));
    expect(shared.conditions).toBe('À terre');
  });

  it('defaults to a well-formed projection for freshly-zeroed rows', () => {
    const shared = toSharedCharacter(makeCharacter(), makeState());
    expect(sharedCharacterSchema.safeParse(shared).success).toBe(true);
    expect(shared.initiative.values).toEqual([]);
  });

  it('produces exactly the shared top-level keys — nothing more', () => {
    const shared = toSharedCharacter(makeCharacter(), makeState());
    expect(Object.keys(shared).sort()).toEqual(
      [
        'attributs',
        'caracteristiques',
        'conditions',
        'effects',
        'initiative',
        'nom',
        'resources',
        'skills',
        'tendances',
        'wounds',
      ].sort(),
    );
  });

  it('shares only trained skills (value > 0), with attribut + spec link', () => {
    const shared = toSharedCharacter(makeCharacter(), makeState(), [
      makeSkill({ name: 'Épée', attribut: 'physique', value: 3 }),
      makeSkill({ name: 'Nage', attribut: 'physique', value: 0 }),
      makeSkill({
        name: 'Herboristerie (Curative)',
        attribut: 'manuel',
        value: 2,
        parentName: 'Herboristerie',
        specLabel: 'Curative',
      }),
    ]);
    expect(shared.skills).toEqual([
      { name: 'Épée', attribut: 'physique', value: 3, parentName: null, specLabel: null },
      {
        name: 'Herboristerie (Curative)',
        attribut: 'manuel',
        value: 2,
        parentName: 'Herboristerie',
        specLabel: 'Curative',
      },
    ]);
  });

  it('shares only active (non-expired) effects, full detail', () => {
    const shared = toSharedCharacter(makeCharacter(), makeState(), [], [
      makeEffect({ label: 'Bénédiction', target: 'coordination', value: 2, durationRemaining: 3 }),
      makeEffect({ label: 'Poison', target: 'all', value: -1, expired: true }),
    ]);
    expect(shared.effects).toEqual([
      {
        label: 'Bénédiction',
        target: 'coordination',
        value: 2,
        durationUnit: 'round',
        durationRemaining: 3,
      },
    ]);
  });

  it('defaults skills and effects to empty when no child rows are given', () => {
    const shared = toSharedCharacter(makeCharacter(), makeState());
    expect(shared.skills).toEqual([]);
    expect(shared.effects).toEqual([]);
  });

  it('leaks no minimised data (backstory, notes, money, magic)', () => {
    // Populate the excluded fields, then assert none of them reach the wire.
    const shared = toSharedCharacter(
      makeCharacter({
        concept: 'assassin',
        biographie: 'longue histoire secrète',
        sphereFeuMax: 8,
        magieInvocatoire: 5,
        sorcellerie: 4,
        reserveMagiqueMax: 12,
      }),
      makeState({
        notes: 'note privée du joueur',
        dracOr: 99,
        sphereFeuCurrent: 3,
        reserveMagiqueCurrent: 10,
      }),
    );
    const json = JSON.stringify(shared).toLowerCase();
    for (const forbidden of [
      'concept',
      'biographie',
      'assassin',
      'secrète',
      'notes',
      'privée',
      'drac',
      'sphere',
      'magie',
      'sorcellerie',
      'reservemagique',
    ]) {
      expect(json).not.toContain(forbidden.toLowerCase());
    }
  });

  it('round-trips through JSON (serialisable wire payload)', () => {
    const shared = toSharedCharacter(
      makeCharacter({ nom: 'Nael', force: 3, graveMax: 4 }),
      makeState({ graveCurrent: 1, initiativeValues: [9] }),
    );
    const round = JSON.parse(JSON.stringify(shared));
    expect(sharedCharacterSchema.parse(round)).toEqual(shared);
  });
});
