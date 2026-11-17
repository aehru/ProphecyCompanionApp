import { useCallback, useState } from 'react';

import { Alert } from '@/lib/alert';
import { parseImport } from '@/lib/character-transfer';
import { pickImportText } from '@/lib/character-transfer-io';
import { importCharacters } from '@/repositories/transfer';

/** « 3 personnages » / « 1 personnage » — French plural, once. */
const plural = (n: number, word: string) => `${n} ${word}${n > 1 ? 's' : ''}`;

/**
 * Pick a JSON export and read it back. `'restore'` is safe as a blanket mode:
 * the FILE decides per character (`bundleMode`) — a backup carries the uuid and
 * replaces its own character in place, a shared sheet carries none and lands as
 * a new one. The alert says which of the two happened.
 */
export function useCharacterImport() {
  const [busy, setBusy] = useState(false);

  /** Resolves true once something was imported (false on cancel / error). */
  const runImport = useCallback(async (): Promise<boolean> => {
    setBusy(true);
    try {
      const raw = await pickImportText();
      if (raw == null) return false; // cancelled
      const parsed = parseImport(raw);
      if (!parsed.ok) {
        Alert.alert('Import impossible', parsed.error);
        return false;
      }
      const { ids, restored } = await importCharacters(parsed.data, 'restore');
      const added = ids.length - restored;
      const parts: string[] = [];
      if (restored > 0) {
        parts.push(`${plural(restored, 'personnage')} restauré${restored > 1 ? 's' : ''}`);
      }
      if (added > 0) parts.push(`${plural(added, 'personnage')} ajouté${added > 1 ? 's' : ''}`);
      const detail = restored > 0 ? '\n\nUne restauration remplace la fiche déjà présente.' : '';
      Alert.alert('Import réussi', `${parts.join(', ')}.${detail}`);
      return true;
    } catch (e) {
      Alert.alert('Import impossible', e instanceof Error ? e.message : String(e));
      return false;
    } finally {
      setBusy(false);
    }
  }, []);

  return { busy, runImport };
}
