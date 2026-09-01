import type { ActualState, Character } from '@/db/schema';
import { asNumRecord, clamp } from '@/lib/character-values';
import { initiativeDiceCount, rollInitiativeWithIcons, trimInitiativeSlots } from '@/lib/dice';
import { updateActualState } from '@/repositories/actual-state';

/**
 * Mirror a write into a local copy of the row, for a screen that holds one.
 * Same signature as React's setState updater.
 */
type Mirror = (update: (previous: ActualState | null) => ActualState | null) => void;

/**
 * Every write to a character's live values, in one place: the two the Fiche and
 * the GM's in-play editor both need (`setStateValue`, `persistState`), the
 * resource pools, and the whole initiative row.
 *
 * It exists because those two screens had grown the same seven closures
 * verbatim — including the rule that dropping an initiative die must drop its
 * stored roll AND its mark — so a fix to one silently left the other wrong. The
 * Magie and Inventaire tabs held a third and fourth copy of `setStateValue`.
 *
 * `mirror` is the only difference between the callers and it is a real one: the
 * Fiche keeps a local copy of the row (`useCharacterState`) so a long-pressed
 * stepper repeats without waiting on the DB, while the GM editor reads through
 * `useLiveQuery` and would fight itself if it also mirrored. Pass it or don't.
 *
 * Named `use…` for the rule it carries rather than for hooks it calls (it calls
 * none): the returned closures capture `char`/`state`, so it belongs at the top
 * of a render, above any early return, next to the hooks it reads from.
 */
export function useInPlayWriters({
  characterId,
  char,
  state,
  mirror,
}: {
  characterId: number;
  char: Character | null | undefined;
  state: ActualState | null | undefined;
  mirror?: Mirror;
}) {
  const rec = asNumRecord(char);
  const stRec = asNumRecord(state);

  const persistState = (patch: Partial<ActualState>) => {
    mirror?.((p) => (p ? ({ ...p, ...patch } as ActualState) : p));
    updateActualState(characterId, patch);
  };
  const setStateValue = (key: string, value: number) =>
    persistState({ [key]: value } as Partial<ActualState>);

  // A pool never goes below zero, nor above the maximum the sheet grants it.
  const adjustRes = (key: string, delta: number) =>
    setStateValue(`${key}Current`, clamp((stRec[`${key}Current`] ?? 0) + delta, 0, rec[`${key}Max`] ?? 0));
  const refillRes = (key: string) => setStateValue(`${key}Current`, rec[`${key}Max`] ?? 0);

  const max = rec.initiativeMax ?? 0;
  const bonus = stRec.initiativeBonusDice ?? 0;
  // How many dice are actually in play this turn — sheet max plus the temporary
  // ones. Sizes the grid, the roll and the per-die writes alike.
  const count = initiativeDiceCount(max, bonus);
  const values = state?.initiativeValues ?? [];
  const icons = state?.initiativeDiceIcons ?? [];

  const initiative = {
    max,
    bonus,
    values,
    icons,
    // Editing one die's value leaves the order alone — only a roll re-sorts.
    onSetDie: (i: number, n: number) =>
      persistState({
        initiativeValues: Array.from({ length: count }, (_, j) => (j === i ? n : values[j] ?? 0)),
      }),
    onSetIcon: (i: number, icon: string) =>
      persistState({
        initiativeDiceIcons: Array.from({ length: count }, (_, j) => (j === i ? icon : icons[j] ?? '')),
      }),
    // Losing a die also drops its stored roll AND its mark, so granting one back
    // shows an empty slot rather than a stale number under someone else's icon.
    onSetBonus: (n: number) => {
      const next = initiativeDiceCount(max, n);
      persistState({
        initiativeBonusDice: n,
        initiativeValues: trimInitiativeSlots(values, next),
        initiativeDiceIcons: trimInitiativeSlots(icons, next),
      });
    },
    // Roll every die in play at once: `count` plain D10, highest-first, each
    // mark carried along with its own roll.
    onRoll: () => {
      const rolled = rollInitiativeWithIcons(count, icons);
      persistState({ initiativeValues: rolled.values, initiativeDiceIcons: rolled.icons });
    },
  };

  return { setStateValue, persistState, adjustRes, refillRes, initiative };
}
