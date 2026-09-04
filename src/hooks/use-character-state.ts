import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';

import type { ActualState, Character } from '@/db/schema';
import { log } from '@/lib/log';
import { ensureActualState, getActualState } from '@/repositories/actual-state';
import { getCharacter } from '@/repositories/characters';

/**
 * Load a character and its actual_state row.
 * - `ensure`: create the state row if missing (status screen needs it to exist).
 * - `reloadOnFocus`: refetch every time the screen regains focus (detail view,
 *   so edits made on the status screen show up on return).
 */
export function useCharacterState(
  id: number,
  { ensure = false, reloadOnFocus = false }: { ensure?: boolean; reloadOnFocus?: boolean } = {},
) {
  const [char, setChar] = useState<Character | null | undefined>(undefined);
  const [state, setState] = useState<ActualState | null>(null);

  const reload = useCallback(() => {
    let active = true;
    // A rejected read resolves to "not there": `char === undefined` is the
    // LOADING state every consumer branches on (characterFallback), so leaving
    // it there on failure hangs the screen on a spinner forever. `null` is the
    // not-found state, which already has a screen. The cause goes to the
    // diagnostic log — that is where a bug report can still find it.
    getCharacter(id)
      .catch((error) => {
        log.error('character.read.failed', error, { characterId: id });
        return null;
      })
      .then((c) => active && setChar(c));
    (ensure ? ensureActualState(id) : getActualState(id))
      .catch((error) => {
        log.error('actual_state.read.failed', error, { characterId: id, ensure });
        return null;
      })
      .then((s) => active && setState(s));
    return () => {
      active = false;
    };
  }, [id, ensure]);

  useEffect(() => {
    if (reloadOnFocus) return;
    return reload();
  }, [reload, reloadOnFocus]);

  useFocusEffect(
    useCallback(() => {
      if (reloadOnFocus) return reload();
    }, [reload, reloadOnFocus]),
  );

  return { char, state, setChar, setState, reload };
}
