import { describe, expect, it } from 'vitest';

import type { CaracKey } from '@/constants/prophecy';
import { toFormValues } from '@/lib/character-values';
import {
  applyBuild,
  buildInitiative,
  buildTraitPool,
  chosenTraits,
  withAge,
  canLeaveStep,
  CREATION_STEPS,
  type CreationBuild,
  EMPTY_BUILD,
  finalAttribut,
  finalCarac,
  finalResource,
  freeTendancesLeft,
  proposeTendances,
  resourcePointsLeft,
  stepResource,
  stepValue,
  tapPuce,
} from '@/lib/creation';
import { assignValue, remainingValues } from '@/lib/distribution';
import { STARTING_VALUES, tendanceStart } from '@/lib/creation-rules';

const IDENTITE = CREATION_STEPS.findIndex((s) => s.key === 'identite');
const P = STARTING_VALUES;

describe('canLeaveStep', () => {
  it('blocks Identité without a name, nothing else', () => {
    const v = toFormValues();
    expect(canLeaveStep(0, v)).toBe(true);
    expect(canLeaveStep(IDENTITE, v)).toBe(false);
    expect(canLeaveStep(IDENTITE, { ...v, nom: '   ' })).toBe(false);
    expect(canLeaveStep(IDENTITE, { ...v, nom: 'Aldéric' })).toBe(true);
  });
});

describe('stepValue', () => {
  it('treats blank as 0 and never goes below it', () => {
    expect(stepValue('', 1)).toBe('1');
    expect(stepValue('0', -1)).toBe('0');
    expect(stepValue('3', -1)).toBe('2');
  });
});

describe('tapPuce', () => {
  it('fills up to the tapped dot, and re-tapping the last empties it', () => {
    expect(tapPuce('', 3)).toBe('4');
    expect(tapPuce('4', 3)).toBe('3');
    expect(tapPuce('4', 0)).toBe('1');
    expect(tapPuce('1', 0)).toBe('0');
  });
});

describe('distribution', () => {
  it('hands out 7/6/6/5/5/4/4/3 once each', () => {
    let a = assignValue<CaracKey>(P, {}, 'force', 7);
    a = assignValue<CaracKey>(P, a, 'resistance', 6);
    expect(remainingValues(P, a)).toEqual([6, 5, 5, 4, 4, 3]);
    expect(assignValue<CaracKey>(P, a, 'force', 7)).toEqual({ resistance: 6 });
  });
  it('swaps a value none of which is left', () => {
    const a = assignValue<CaracKey>(P, assignValue<CaracKey>(P, {}, 'force', 7), 'resistance', 3);
    expect(assignValue<CaracKey>(P, a, 'resistance', 7)).toEqual({ force: 3, resistance: 7 });
    expect(assignValue<CaracKey>(P, { force: 7 }, 'volonte', 7)).toEqual({ volonte: 7 });
  });
});

describe('the build', () => {
  it('folds age and the single transferred point into a caractéristique', () => {
    const build = {
      ...EMPTY_BUILD,
      age: 'enfant' as const,
      assign: { force: 3, empathie: 5 },
      transfer: { from: 'force' as const, to: 'empathie' as const },
    };
    expect(finalCarac(build, 'force')).toBe(0); // 3 − 2 − 1
    expect(finalCarac(build, 'empathie')).toBe(8); // 5 + 2 + 1
    expect(finalCarac(build, 'volonte')).toBeNull();
    const v = applyBuild(toFormValues(), build);
    expect([v.force, v.empathie, v.volonte]).toEqual(['0', '8', '']);
  });
  it('ignores a half-picked transfer', () => {
    const transfer = { from: '' as const, to: 'force' as const };
    expect(finalCarac({ ...EMPTY_BUILD, assign: { force: 5 }, transfer }, 'force')).toBe(5);
  });
  it('adds the modificateur of the two related caractéristiques, floored at 0', () => {
    const build = {
      ...EMPTY_BUILD,
      assign: { force: 7, resistance: 6, intelligence: 3 },
      attributs: { physique: 5, mental: 3, social: 4 },
    };
    expect(finalAttribut(build, 'physique')).toBe(6); // 5 + (13 → +1)
    expect(finalAttribut(build, 'mental')).toBe(1); // 3 + (3 → −2)
    expect(finalAttribut(build, 'social')).toBe(4); // no caracs yet: NA
    expect(finalAttribut(build, 'manuel')).toBeNull();
  });
  it('derives the initiative from COO + PER, unless one was typed', () => {
    const build = { ...EMPTY_BUILD, assign: { coordination: 7, perception: 6 } };
    expect(buildInitiative({ ...EMPTY_BUILD, assign: { coordination: 7 } })).toBeNull();
    expect(applyBuild(toFormValues(), build).initiativeMax).toBe('3'); // 13
    expect(applyBuild({ ...toFormValues(), initiativeMax: '1' }, build).initiativeMax).toBe('1');
  });
  it('adds the age fixed Maîtrise / Chance to the free points handed out', () => {
    let build: CreationBuild = { ...EMPTY_BUILD, age: 'enfant' }; // 4 Chance, 3 free
    expect(resourcePointsLeft(build)).toBe(3);
    build = { ...build, resources: stepResource(build, 'maitrise', 1) };
    build = { ...build, resources: stepResource(build, 'chance', 1) };
    build = { ...build, resources: stepResource(build, 'chance', 1) };
    expect(resourcePointsLeft(build)).toBe(0);
    expect(stepResource(build, 'maitrise', 1)).toEqual(build.resources); // nothing left
    expect([finalResource(build, 'maitrise'), finalResource(build, 'chance')]).toEqual([1, 6]);
    const v = applyBuild(toFormValues(), build);
    expect([v.maitriseMax, v.chanceMax]).toEqual(['1', '6']);
    expect(applyBuild(toFormValues(), EMPTY_BUILD).chanceMax).toBe('');
    expect(applyBuild({ ...toFormValues(), chanceMax: '9' }, build).maitriseMax).toBe('');
  });
  it('proposes a nation’s tendances and counts the free points left', () => {
    const start = tendanceStart('marne', 'adulte'); // 1TD, 1TF, 2L
    const v = proposeTendances({ ...toFormValues(), dragonSub: '4' }, start);
    expect([v.dragon, v.fatalite, v.homme, v.dragonSub]).toEqual(['1', '1', '0', '4']);
    expect(freeTendancesLeft(v, start)).toBe(2);
    expect(freeTendancesLeft({ ...v, homme: '3' }, start)).toBe(-1);
  });
  it('pools the désavantages taken against the avantages bought', () => {
    const build: CreationBuild = {
      ...EMPTY_BUILD,
      desavantages: { 'obligatoire-0': { presetId: 'a', cost: 3, note: '' } },
      avantages: [{ presetId: 'b', cost: 2, note: '' }],
    };
    expect(buildTraitPool(build)).toEqual({ gained: 3, spent: 2, balance: 1 });
    expect(chosenTraits(build).map((t) => `${t.kind}:${t.presetId}`)).toEqual([
      'desavantage:a',
      'avantage:b',
    ]);
  });
  it('starts the age-bound choices over on a new age only', () => {
    const build: CreationBuild = {
      ...EMPTY_BUILD,
      age: 'adulte',
      attributs: { physique: 5 },
      resources: { chance: 2 },
      desavantages: { 'obligatoire-0': { presetId: 'a', cost: 3, note: '' } },
      avantages: [{ presetId: 'b', cost: 2, note: '' }],
    };
    expect(withAge(build, 'adulte')).toBe(build);
    const older = withAge(build, 'ancien');
    expect([older.attributs, older.resources, older.desavantages]).toEqual([{}, {}, {}]);
    expect(older.avantages).toEqual(build.avantages);
  });
  it('derives the wound track from RÉS + VOL, unless one was typed', () => {
    const build = { ...EMPTY_BUILD, assign: { resistance: 6, volonte: 5 } }; // 11
    const v = applyBuild(toFormValues(), build);
    expect([v.egratignureMax, v.legereMax, v.graveMax, v.fataleMax, v.mortMax]).toEqual([
      '3', '2', '2', '1', '1',
    ]);
    expect(applyBuild({ ...toFormValues(), graveMax: '4' }, build).legereMax).toBe('');
    expect(applyBuild(toFormValues(), { ...EMPTY_BUILD, assign: { resistance: 6 } }).legereMax).toBe('');
  });
});
