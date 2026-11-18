import { describe, expect, it } from 'vitest';

import { FORBIDDEN_SKILLS, RESERVED_SKILLS, skillAccess, skillCostFactor } from './skill-access';
import { SKILL_OPTION_IDS } from './skill-profiles';

describe('skill access', () => {
  it('names only options the app knows', () => {
    for (const id of [...Object.keys(RESERVED_SKILLS), ...FORBIDDEN_SKILLS]) {
      expect(SKILL_OPTION_IDS).toContain(id);
    }
  });

  it('doubles a réservée outside its castes only', () => {
    expect(skillAccess('Alchimie', 'erudit')).toBeNull();
    expect(skillAccess('Alchimie', 'mage')).toBe('reservee');
    expect(skillAccess('Alchimie', '')).toBe('reservee');
    expect(skillCostFactor('Alchimie', 'mage')).toBe(2);
    expect(skillCostFactor('Esquive', 'mage')).toBe(1);
  });

  it('reserves the Disciplines to mages', () => {
    expect(skillAccess('discipline:magieInvocatoire', 'mage')).toBeNull();
    expect(skillAccess('discipline:magieInvocatoire', 'artisan')).toBe('reservee');
  });

  it('doubles an interdite for everyone', () => {
    expect(skillAccess('Armes mécanique', 'artisan')).toBe('interdite');
    expect(skillCostFactor('Armes mécanique', 'artisan')).toBe(2);
  });
});
