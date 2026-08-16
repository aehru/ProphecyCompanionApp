import { type Href, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { Snackbar } from 'react-native-paper';

/** The `/character/[id]/<kind>/[rowId]` editors a catalogue picker can land on. */
export type CatalogKind = 'armor' | 'shield' | 'weapon' | 'spell';

/**
 * What a catalogue picker does after it inserts a row — the same two moves in
 * all four (armes, armures, boucliers, sortilèges):
 *
 * - a **blank** entry has nothing left to read in the catalogue, so it goes
 *   straight to its editor ({@link CatalogSnackbarState.openEditor});
 * - a **preset** keeps the catalogue open (a player equips a party, not one
 *   sword) and gets a toast whose « Modifier » leads to the new row
 *   ({@link CatalogSnackbarState.announce}).
 *
 * The editor route is built here from the character and the kind rather than
 * taken as a callback: an inline `(id) => …` arrow would be a new function on
 * every render, and the spell picker feeds its `add` into `React.memo`'d rows
 * where that would undo the memo.
 */
export interface CatalogSnackbarState {
  toast: { text: string; rowId: number } | null;
  /** Toast « X ajouté. », with a « Modifier » action pointing at `rowId`. */
  announce: (text: string, rowId: number) => void;
  dismiss: () => void;
  /** Go to a row's editor, replacing the picker rather than stacking on it. */
  openEditor: (rowId: number) => void;
}

export function useCatalogSnackbar(characterId: number, kind: CatalogKind): CatalogSnackbarState {
  const router = useRouter();
  const [toast, setToast] = useState<{ text: string; rowId: number } | null>(null);

  // Cast because `kind` is a variable: typed routes can check a literal path,
  // not one assembled from a union at runtime. The union is what keeps it safe.
  const openEditor = useCallback(
    (rowId: number) => router.replace(`/character/${characterId}/${kind}/${rowId}` as Href),
    [router, characterId, kind],
  );

  // The three actions are stable and only `toast` moves. That matters to the
  // spell picker, whose `add` closes over them and feeds `React.memo`'d rows:
  // an `announce` rebuilt whenever a toast fires would re-render the list on
  // every insertion.
  const announce = useCallback((text: string, rowId: number) => setToast({ text, rowId }), []);
  const dismiss = useCallback(() => setToast(null), []);

  return useMemo(
    () => ({ toast, announce, dismiss, openEditor }),
    [toast, announce, dismiss, openEditor],
  );
}

/** The toast itself. Pair with {@link useCatalogSnackbar}. */
export default function CatalogSnackbar({ state }: { state: CatalogSnackbarState }) {
  const { toast, dismiss, openEditor } = state;
  return (
    <Snackbar
      visible={toast !== null}
      onDismiss={dismiss}
      duration={3000}
      action={{
        label: 'Modifier',
        onPress: () => {
          if (toast) openEditor(toast.rowId);
        },
      }}>
      {toast?.text ?? ''}
    </Snackbar>
  );
}
