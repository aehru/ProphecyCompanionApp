import { describe, expect, it } from 'vitest';

import { awardTotal, clampScore, xpAvailable, xpEarned } from '@/lib/xp';

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

const scores = { danger: 1, decouverte: 2, magie: 0, implication: 3, initiatives: 5 };

describe('awardTotal', () => {
  it('doubles the chosen Valeur', () => {
    expect(awardTotal({ ...scores, chosenValeur: 'implication' })).toBe(11 + 3);
    expect(awardTotal({ ...scores, chosenValeur: 'magie' })).toBe(11);
  });
});

describe('xpEarned', () => {
  it('adds closed scénarios to the base, ignores the open one', () => {
    const closed = { ...scores, chosenValeur: 'danger' as const, endedAt: new Date(0) };
    const open = { ...scores, chosenValeur: 'danger' as const, endedAt: null };
    expect(xpEarned(20, [closed, open])).toBe(20 + 12);
  });
});

describe('clampScore', () => {
  it('keeps a score within 0–5', () => {
    expect([clampScore(-2), clampScore(3.7), clampScore(9), clampScore(NaN)]).toEqual([0, 3, 5, 0]);
  });
});
