import { describe, expect, it } from 'vitest';

import { xpAvailable } from '@/lib/xp';

describe('xpAvailable', () => {
  it('is what has not been spent yet', () => {
    expect(xpAvailable(30, 12)).toBe(18);
  });

  it('is zero on a fresh character', () => {
    expect(xpAvailable(0, 0)).toBe(0);
  });

  // Debt is a real state: the GM allows a purchase before the session's award
  // is handed out. Clamping here would silently forgive it.
  it('goes negative when more is spent than earned', () => {
    expect(xpAvailable(10, 25)).toBe(-15);
  });
});
