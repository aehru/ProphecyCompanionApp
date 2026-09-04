import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  currentRoller,
  dismissRoller,
  openRoller,
  resetRoller,
  setRollerSides,
  subscribeRoller,
} from './dice-roller';

beforeEach(() => resetRoller());

describe('the dice roller store', () => {
  it('starts closed and opens contextless from a header button', () => {
    expect(currentRoller()).toBeNull();
    openRoller();
    expect(currentRoller()).toEqual({ context: null, sides: 10 });
  });

  it('opens against a context and forgets it on the next open', () => {
    const context = { label: 'Volonté', parts: [{ label: 'VOL', value: 5 }], confirm: 5 };
    openRoller(context);
    expect(currentRoller()?.context).toBe(context);
    // Reopening from a header is always contextless — unlike the die size.
    openRoller();
    expect(currentRoller()?.context).toBeNull();
  });

  it('keeps the picked die across opens, and resets with the store', () => {
    setRollerSides(20);
    openRoller();
    expect(currentRoller()?.sides).toBe(20);
    dismissRoller();
    openRoller();
    expect(currentRoller()?.sides).toBe(20);
    resetRoller();
    openRoller();
    expect(currentRoller()?.sides).toBe(10);
  });

  it('carries a size change into the open roller', () => {
    openRoller();
    setRollerSides(6);
    expect(currentRoller()?.sides).toBe(6);
  });

  it('returns a reference-stable snapshot between changes', () => {
    // useSyncExternalStore loops forever on a getSnapshot that builds a fresh
    // object per read — this is the invariant that keeps <DiceRollerHost> sane.
    openRoller();
    expect(currentRoller()).toBe(currentRoller());
  });

  it('notifies subscribers on open, size and dismiss — and stops after unsubscribe', () => {
    const seen = vi.fn();
    const unsubscribe = subscribeRoller(seen);
    openRoller();
    setRollerSides(20);
    dismissRoller();
    expect(seen).toHaveBeenCalledTimes(3);
    // Dismissing an already-closed roller changes nothing, so it says nothing.
    dismissRoller();
    expect(seen).toHaveBeenCalledTimes(3);
    unsubscribe();
    openRoller();
    expect(seen).toHaveBeenCalledTimes(3);
  });
});
