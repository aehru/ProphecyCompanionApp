import { describe, expect, it } from 'vitest';

import { CASTES } from '@/constants/prophecy';
import {
  CASTE_SKILL_PROFILES,
  magicField,
  optionLabel,
  PROFILE_VALUES,
  SKILL_OPTION_IDS,
  skillProfile,
} from '@/lib/skill-profiles';

describe('caste skill profiles', () => {
  it('covers every caste with one slot per base score', () => {
    for (const c of CASTES) {
      expect([c.key, CASTE_SKILL_PROFILES[c.key].slots.length]).toEqual([
        c.key,
        PROFILE_VALUES.length,
      ]);
    }
  });
  it('only names compétences and magic scores the app knows', () => {
    const known = new Set(SKILL_OPTION_IDS);
    for (const [caste, p] of Object.entries(CASTE_SKILL_PROFILES)) {
      const unknown = [...p.slots.flat(), ...p.recommended].filter((id) => !known.has(id));
      expect([caste, unknown]).toEqual([caste, []]);
    }
  });
  it('has no profile outside a caste', () => {
    expect(skillProfile('')).toBeNull();
    expect(skillProfile(null)).toBeNull();
    expect(skillProfile('mage')?.slots[3]).toContain('discipline:magieInvocatoire');
  });
});

describe('option ids', () => {
  it('labels and routes magic scores to their columns', () => {
    expect(optionLabel('Esquive')).toBe('Esquive');
    expect(optionLabel('sphere:sphereFeu')).toBe('Sphère : Feu');
    expect(magicField('sphere:sphereFeu')).toBe('sphereFeuMax');
    expect(magicField('discipline:sorcellerie')).toBe('sorcellerie');
    expect(magicField('Esquive')).toBeNull();
  });
});
