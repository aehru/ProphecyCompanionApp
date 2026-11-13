import { describe, expect, it } from 'vitest';

import { PRIVILEGE_CATALOG } from '@/data/privilege-catalog';
import { privilegeOffCaste, privilegesFor } from '@/lib/privilege';

describe('privilegesFor', () => {
  it('offers only the caste, Ordres Noirs gated by the oath', () => {
    const open = privilegesFor(PRIVILEGE_CATALOG, 'combattant', false);
    const sworn = privilegesFor(PRIVILEGE_CATALOG, 'combattant', true);
    expect(open.length).toBeGreaterThan(0);
    expect(open.every((p) => p.caste === 'combattant' && !p.darkOrders)).toBe(true);
    expect(sworn.some((p) => p.darkOrders)).toBe(true);
    expect(sworn.length).toBeGreaterThan(open.length);
  });

  it('offers nothing without a caste', () => {
    expect(privilegesFor(PRIVILEGE_CATALOG, null, true)).toEqual([]);
  });
});

describe('privilegeOffCaste', () => {
  const row = { caste: 'mage', darkOrders: false };
  it('flags another caste', () => {
    expect(privilegeOffCaste(row, 'mage', false)).toBe(false);
    expect(privilegeOffCaste(row, 'artisan', false)).toBe(true);
    expect(privilegeOffCaste(row, null, false)).toBe(true);
  });
  it('flags an Ordres Noirs entry once the oath is gone', () => {
    const dark = { caste: 'mage', darkOrders: true };
    expect(privilegeOffCaste(dark, 'mage', true)).toBe(false);
    expect(privilegeOffCaste(dark, 'mage', false)).toBe(true);
  });
});
