import { describe, expect, it } from 'vitest';

import { toFormValues } from '@/lib/character-values';
import {
  applySkills,
  baseScores,
  chooseProfileOption,
  EMPTY_SKILLS,
  type SkillBuild,
  scoreProfileSlot,
  setSpec,
  skillPointsLeft,
  skillPointsSpent,
  skillRows,
  skillScore,
  stepSkill,
  stepSpec,
} from '@/lib/creation-skills';

const specName = (m: string, l: string) => `${m} (${l})`;

/** A Mage with Corps à corps 6, Invocatoire 6, Connaissance de la magie 5. */
function mage(): SkillBuild {
  let s = EMPTY_SKILLS;
  s = chooseProfileOption(s, 'mage', 0, 'Corps à corps');
  s = scoreProfileSlot(s, 'mage', 0, 6);
  s = chooseProfileOption(s, 'mage', 3, 'discipline:magieInvocatoire');
  s = scoreProfileSlot(s, 'mage', 3, 6);
  s = chooseProfileOption(s, 'mage', 2, 'Connaissance de la magie');
  s = scoreProfileSlot(s, 'mage', 2, 5);
  return s;
}

describe('base profile', () => {
  it('scores the chosen options, and forgets them for another caste', () => {
    const s = mage();
    expect(baseScores(s, 'mage')).toEqual({
      'Corps à corps': 6,
      'discipline:magieInvocatoire': 6,
      'Connaissance de la magie': 5,
    });
    expect(baseScores(s, 'erudit')).toEqual({});
  });
  it('moves an option already taken in another slot', () => {
    let s = chooseProfileOption(EMPTY_SKILLS, 'artisan', 3, 'Artisanat');
    s = chooseProfileOption(s, 'artisan', 4, 'Artisanat');
    expect(s.choices).toEqual({ 4: 'Artisanat' });
  });
});

describe('free points', () => {
  it('prices raises from the base on the COÛT table, within the age limit', () => {
    let s = stepSkill(mage(), 'mage', 'adulte', 'Corps à corps', 1); // 6 → 7: 7
    s = stepSkill(s, 'mage', 'adulte', 'Esquive', 1); // 0 → 1: 1
    expect(skillScore(s, 'mage', 'Corps à corps')).toBe(7);
    expect(skillPointsSpent(s, 'mage')).toBe(8);
    expect(skillPointsLeft(s, 'mage', 'adulte')).toBe(102);
    // Adulte stops at 8, and nothing goes under the base.
    s = stepSkill(stepSkill(s, 'mage', 'adulte', 'Corps à corps', 1), 'mage', 'adulte', 'Corps à corps', 1);
    expect(skillScore(s, 'mage', 'Corps à corps')).toBe(8);
    expect(skillScore(stepSkill(mage(), 'mage', 'adulte', 'Corps à corps', -1), 'mage', 'Corps à corps')).toBe(6);
  });
  it('doubles a réservée outside its castes', () => {
    const s = stepSkill(stepSkill(mage(), 'mage', 'adulte', 'Alchimie', 1), 'mage', 'adulte', 'Alchimie', 1);
    expect(skillPointsSpent(s, 'mage')).toBe(6); // 0 → 2: 3, ×2
    expect(skillPointsSpent({ ...s, caste: 'erudit' }, 'erudit')).toBe(3);
  });
  it('spends on the experience tier the GM granted', () => {
    expect(skillPointsLeft({ ...mage(), tier: 'veteran' }, 'mage', 'adulte')).toBe(200);
  });
});

describe('spécialisation', () => {
  it('starts at its mother’s base and raises at half price, rounded up', () => {
    let s = setSpec(mage(), 'mage', 'Corps à corps', 'Lutte');
    expect(s.spec?.score).toBe(6);
    expect(skillPointsSpent(s, 'mage')).toBe(0);
    s = stepSpec(s, 'mage', 'adulte', 1); // 6 → 7 costs 7, halved: 4
    expect(skillPointsSpent(s, 'mage')).toBe(4);
    expect(stepSpec(s, 'mage', 'adulte', -5).spec?.score).toBe(6);
  });
});

describe('output', () => {
  it('writes magic scores into the form and the rest as skill rows', () => {
    const s = setSpec(mage(), 'mage', 'Corps à corps', 'Lutte');
    expect(applySkills(toFormValues(), s, 'mage').magieInvocatoire).toBe('6');
    expect(skillRows(s, 'mage', specName)).toEqual([
      { name: 'Corps à corps', attribut: 'physique', value: 6 },
      { name: 'Connaissance de la magie', attribut: 'mental', value: 5 },
      {
        name: 'Corps à corps (Lutte)',
        attribut: 'physique',
        value: 6,
        parentName: 'Corps à corps',
        specLabel: 'Lutte',
      },
    ]);
  });
});
