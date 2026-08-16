// One place that assembles a spell's casting score for a character: the sheet
// (sphere maxes + disciplines), the live wounds and the active effects. Every
// screen that shows a total reads it through here, so the arithmetic — and the
// choice of which sources feed it — lives in lib/spell-total alone.

import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { useMemo } from 'react';

import { asNumRecord } from '@/lib/character-values';
import { woundMalus } from '@/lib/modifiers';
import { spellTotal, type SpellTotal, type SpellTotalInput } from '@/lib/spell-total';
import { actualStateQuery } from '@/repositories/actual-state';
import { characterQuery } from '@/repositories/characters';
import { effectsQuery } from '@/repositories/effects';

export interface SpellReadings {
  /** Casting score for a `spells` row or a catalogue preset. */
  totalFor: (spell: SpellTotalInput) => SpellTotal;
  /**
   * A caractéristique's value on the sheet — the `FormulaVars.carac` resolver a
   * durée needs when the rulebook scales it off a stat (« une minute par point
   * de Volonté »). Same record the score reads, so the two can't drift.
   */
  caracValue: (caracKey: string) => number;
}

/**
 * The character-derived readings a spell needs to be displayed. Reactive: a
 * sphere edit, a new wound or an expiring effect all re-render whatever reads
 * them.
 */
export function useSpellTotal(characterId: number): SpellReadings {
  const { data: charRows } = useLiveQuery(characterQuery(characterId), [characterId]);
  const { data: stateRows } = useLiveQuery(actualStateQuery(characterId), [characterId]);
  const { data: effects } = useLiveQuery(effectsQuery(characterId), [characterId]);

  // Memoized down to the query rows, and the returned object with them. Not a
  // micro-optimisation: the catalogue passes `totalFor` into a `React.memo`'d
  // row, so a pair of closures rebuilt on every render made the memo a no-op
  // and re-rendered 300 spells on every keystroke.
  return useMemo(() => {
    const rec = asNumRecord(charRows?.[0] ?? {});
    const wound = woundMalus(asNumRecord(stateRows?.[0] ?? {}));
    const effectList = effects ?? [];
    return {
      totalFor: (spell) => spellTotal(spell, rec, effectList, wound),
      caracValue: (k) => rec[k] ?? 0,
    };
  }, [charRows, stateRows, effects]);
}
