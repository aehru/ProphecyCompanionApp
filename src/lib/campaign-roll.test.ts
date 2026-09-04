import { describe, expect, it } from 'vitest';

import { sharedStatRollContext } from './campaign-roll';
import { contextValue } from './roll';

describe('sharedStatRollContext', () => {
  const character = {
    caracteristiques: { volonte: 5, force: 4 },
    attributs: { physique: 3 },
    wounds: { legere: { current: 1, max: 2 }, grave: { current: 0, max: 2 } },
    effects: [
      { target: 'volonte', value: 2 },
      { target: 'all', value: 1 },
      { target: 'force', value: 9 },
    ],
  };

  it('rolls a caractéristique off the projection, wound malus folded in', () => {
    const ctx = sharedStatRollContext(character, 'volonte', 'caracteristique');
    // 5 + 2 (aimed) + 1 (all) - 1 (légère) — the same arithmetic the player's
    // own tile would produce from the DB row.
    expect(contextValue(ctx)).toBe(7);
    // Confirmation is the stat itself, never the modified total.
    expect(ctx.confirm).toBe(5);
    expect(ctx.label).toBe('Volonté');
  });

  it('reads attributs from their own record', () => {
    const ctx = sharedStatRollContext(character, 'physique', 'attribut');
    expect(contextValue(ctx)).toBe(3 + 1 - 1);
    expect(ctx.confirmLabel).toBe('Attribut');
  });

  it('treats a projection missing everything as zeros', () => {
    // Every field of a projection is optional on the wire — a stat the sender
    // never included must roll as 0, not throw.
    const ctx = sharedStatRollContext({}, 'volonte', 'caracteristique');
    expect(contextValue(ctx)).toBe(0);
  });
});
