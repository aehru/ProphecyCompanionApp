import { useCallback, useEffect, useMemo, useState } from 'react';
import { BackHandler, Platform } from 'react-native';

/**
 * Multi-selection state for a list screen (issue #94): long-press a row to enter
 * selection mode, tap to add/remove, act on the batch from the contextual header.
 *
 * Selection mode is not a separate flag — it IS "the selection is non-empty", so
 * unticking the last row leaves the mode on its own and there is no state pair
 * to keep in sync. The live `ids` are passed in and the selection is *derived*
 * from them, so a row that leaves the list (deleted, or replaced by an import)
 * drops out with no effect syncing state back to the data.
 *
 * On Android the hardware back button clears the selection instead of leaving
 * the screen, matching every system multi-select UI.
 */
export function useCharacterSelection(ids: readonly number[]) {
  const [picked, setPicked] = useState<ReadonlySet<number>>(() => new Set());

  // List order, not click order — the export/duplicate batches then read the
  // same way the user sees them.
  const selectedIds = useMemo(() => ids.filter((id) => picked.has(id)), [ids, picked]);
  const active = selectedIds.length > 0;
  const allSelected = ids.length > 0 && selectedIds.length === ids.length;

  const isSelected = useCallback((id: number) => picked.has(id), [picked]);

  const toggle = useCallback((id: number) => {
    setPicked((prev) => {
      const next = new Set(prev);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  }, []);

  const clear = useCallback(() => setPicked(new Set()), []);

  /** Select every row, or clear when they are already all selected. */
  const toggleAll = useCallback(
    () => setPicked(allSelected ? new Set() : new Set(ids)),
    [allSelected, ids],
  );

  useEffect(() => {
    if (!active || Platform.OS !== 'android') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      clear();
      return true; // handled — don't pop the screen
    });
    return () => sub.remove();
  }, [active, clear]);

  return { selectedIds, active, allSelected, isSelected, toggle, clear, toggleAll };
}

export type CharacterSelection = ReturnType<typeof useCharacterSelection>;
