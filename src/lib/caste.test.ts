import { describe, expect, it } from 'vitest';

import { CASTES } from '@/constants/prophecy';
import { casteFromInput } from '@/lib/caste';

describe('casteFromInput', () => {
  it('accepts the stored key', () => {
    expect(casteFromInput('erudit')).toBe('erudit');
    expect(casteFromInput('commercant')).toBe('commercant');
  });

  it('accepts the accented label, in any case, with stray whitespace', () => {
    expect(casteFromInput('Érudit')).toBe('erudit');
    expect(casteFromInput('  COMMERÇANT ')).toBe('commercant');
    expect(casteFromInput('mage')).toBe('mage');
  });

  it('round-trips every caste from both its key and its label', () => {
    for (const c of CASTES) {
      expect(casteFromInput(c.key)).toBe(c.key);
      expect(casteFromInput(c.label)).toBe(c.key);
    }
  });

  it('treats blank, unknown and non-strings as « Sans Caste » rather than throwing', () => {
    expect(casteFromInput('')).toBeNull();
    expect(casteFromInput('   ')).toBeNull();
    expect(casteFromInput('Sans Caste')).toBeNull();
    expect(casteFromInput('Chevalier')).toBeNull();
    expect(casteFromInput(null)).toBeNull();
    expect(casteFromInput(undefined)).toBeNull();
    expect(casteFromInput(42)).toBeNull();
  });
});
