import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

/**
 * When the last « sauvegarde » export was handed to the share sheet. A DEVICE
 * preference like the « Apparence » dragon (AsyncStorage, never exported): it
 * describes this phone's safety net, not a character.
 */
const STORAGE_KEY = 'backup.lastAt';

/**
 * Call after ANY export made with the 'backup' intent. Best effort: the sheet
 * opened, which is all we can know — on Android `shareAsync` resolves the same
 * whether the user saved the file or dismissed the sheet, so a cancelled
 * backup still counts as one.
 */
export async function recordBackup(now = Date.now()): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, String(now)).catch(() => {});
}

/**
 * Last backup timestamp (ms) or null, re-read every time the screen gains focus.
 * `readAt` is when that read happened — the « now » to age it against, kept out
 * of render so the age stays pure. `record` is `recordBackup` for a screen that
 * shows the date: focus never changes while the share sheet is up, so it
 * updates the state itself.
 */
export function useLastBackup() {
  const [state, setState] = useState<{ lastAt: number | null; readAt: number }>({
    lastAt: null,
    readAt: 0,
  });
  useFocusEffect(
    useCallback(() => {
      AsyncStorage.getItem(STORAGE_KEY)
        .then((v) => {
          const n = v == null ? NaN : Number(v);
          setState({ lastAt: Number.isFinite(n) ? n : null, readAt: Date.now() });
        })
        .catch(() => {});
    }, []),
  );
  const record = useCallback(async () => {
    const now = Date.now();
    await recordBackup(now);
    setState({ lastAt: now, readAt: now });
  }, []);
  return { ...state, record };
}
