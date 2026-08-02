// One place that assembles a spell's casting score for a character: the sheet
// (sphere maxes + disciplines), the live wounds and the active effects. Every
// screen that shows a total reads it through here, so the arithmetic — and the
// choice of which sources feed it — lives in lib/spell-total alone.

import { useLiveQuery } from 'drizzle-orm/expo-sqlite';

import { asNumRecord } from '@/lib/character-values';
import { woundMalus } from '@/lib/modifiers';
import { spellTotal, type SpellTotal, type SpellTotalInput } from '@/lib/spell-total';
import { actualStateQuery } from '@/repositories/actual-state';
import { characterQuery } from '@/repositories/characters';
import { effectsQuery } from '@/repositories/effects';

/**
 * Returns a scorer for `characterId`'s spells — call it with a `spells` row or
 * a catalogue preset. Reactive: a sphere edit, a new wound or an expiring
 * effect all re-render the totals.
 */
export function useSpellTotal(characterId: number): (spell: SpellTotalInput) => SpellTotal {
  const { data: charRows } = useLiveQuery(characterQuery(characterId), [characterId]);
  const { data: stateRows } = useLiveQuery(actualStateQuery(characterId), [characterId]);
  const { data: effects } = useLiveQuery(effectsQuery(characterId), [characterId]);

  const rec = asNumRecord(charRows?.[0] ?? {});
  const wound = woundMalus(asNumRecord(stateRows?.[0] ?? {}));
  const effectList = effects ?? [];

  return (spell) => spellTotal(spell, rec, effectList, wound);
}
