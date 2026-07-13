import { describe, expect, it } from 'vitest';

import type { Effect } from '@/db/schema';

import {
  activeEffects,
  effectsSum,
  fmtSignedMod,
  isSkillTarget,
  skillModifier,
  skillTarget,
  skillTargetName,
  totalModifier,
  woundMalus,
} from './modifiers';

// Build an Effect row with sensible defaults; override what a test cares about.
function makeEffect(over: Partial<Effect> = {}): Effect {
  return {
    id: 1,
    characterId: 1,
    label: '',
    target: 'all',
    value: 0,
    durationUnit: 'round',
    durationRemaining: 1,
    expired: false,
    createdAt: new Date(0),
    ...over,
  };
}

// Wound state keyed by `${level}Current`, matching actual_state columns.
const wounds = (filled: Record<string, number>) => filled;

describe('woundMalus', () => {
  it('is 0 with no filled wound boxes', () => {
    expect(woundMalus(wounds({}))).toBe(0);
  });

  it('returns the malus of a single active level', () => {
    expect(woundMalus(wounds({ legereCurrent: 2 }))).toBe(-1);
    expect(woundMalus(wounds({ graveCurrent: 1 }))).toBe(-3);
  });

  it('takes the WORST malus, not the sum, across active levels', () => {
    // Fatale (-5) + Légère (-1) together → -5, not -6.
    expect(woundMalus(wounds({ fataleCurrent: 1, legereCurrent: 3 }))).toBe(-5);
  });

  it('ignores levels with no malus (Égratignure, Mort)', () => {
    expect(woundMalus(wounds({ egratignureCurrent: 3, mortCurrent: 1 }))).toBe(0);
  });
});

describe('activeEffects', () => {
  it('drops expired effects', () => {
    const list = [makeEffect({ id: 1 }), makeEffect({ id: 2, expired: true })];
    expect(activeEffects(list).map((e) => e.id)).toEqual([1]);
  });
});

describe('effectsSum', () => {
  it('sums effects targeting the exact stat and effects targeting all', () => {
    const list = [
      makeEffect({ target: 'all', value: 2 }),
      makeEffect({ target: 'force', value: -1 }),
      makeEffect({ target: 'volonte', value: 5 }),
    ];
    expect(effectsSum('force', list)).toBe(1); // +2 (all) + -1 (force)
  });

  it('counts only the all effect for an unrelated stat', () => {
    const list = [
      makeEffect({ target: 'all', value: 2 }),
      makeEffect({ target: 'force', value: -1 }),
    ];
    expect(effectsSum('volonte', list)).toBe(2);
  });

  it('ignores expired effects', () => {
    const list = [
      makeEffect({ target: 'all', value: 2, expired: true }),
      makeEffect({ target: 'force', value: -1 }),
    ];
    expect(effectsSum('force', list)).toBe(-1);
  });

  it('is 0 for an empty list', () => {
    expect(effectsSum('force', [])).toBe(0);
  });
});

describe('totalModifier', () => {
  it('adds the wound malus to the matching effects sum', () => {
    const list = [makeEffect({ target: 'all', value: 2 })];
    // wound -5 + (all +2) = -3.
    expect(totalModifier('force', list, -5)).toBe(-3);
  });

  it('equals just the wound malus when no effects match', () => {
    expect(totalModifier('force', [], -3)).toBe(-3);
  });
});

describe('skill targets', () => {
  it('round-trips a skill name through the skill: prefix', () => {
    const t = skillTarget('Discrétion');
    expect(t).toBe('skill:Discrétion');
    expect(isSkillTarget(t)).toBe(true);
    expect(skillTargetName(t)).toBe('Discrétion');
  });

  it('does not treat a stat key as a skill target', () => {
    expect(isSkillTarget('force')).toBe(false);
    // skillTargetName leaves a non-skill target unchanged.
    expect(skillTargetName('force')).toBe('force');
  });
});

describe('skillModifier', () => {
  it('adds a skill-specific effect on top of the attribut modifier', () => {
    const list = [
      makeEffect({ target: 'all', value: 1 }),
      makeEffect({ target: 'physique', value: 2 }),
      makeEffect({ target: skillTarget('Discrétion'), value: 3 }),
    ];
    // wound 0 + all(+1) + physique(+2) + skill(+3) = 6.
    expect(skillModifier('physique', 'Discrétion', list, 0)).toBe(6);
  });

  it('ignores an effect targeting a different skill', () => {
    const list = [makeEffect({ target: skillTarget('Escalade'), value: 3 })];
    expect(skillModifier('physique', 'Discrétion', list, 0)).toBe(0);
  });

  it('folds in the wound malus like a stat roll', () => {
    const list = [makeEffect({ target: skillTarget('Discrétion'), value: 2 })];
    // wound -5 + skill(+2) = -3.
    expect(skillModifier('physique', 'Discrétion', list, -5)).toBe(-3);
  });
});

describe('fmtSignedMod', () => {
  it('prefixes positive numbers with +', () => {
    expect(fmtSignedMod(1)).toBe('+1');
  });

  it('keeps the native minus sign for negatives', () => {
    expect(fmtSignedMod(-5)).toBe('-5');
  });

  it('renders zero without a sign', () => {
    expect(fmtSignedMod(0)).toBe('0');
  });
});
