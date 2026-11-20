import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { type CreationDraft, parseDraft } from '@/lib/creation-draft';

/**
 * The one guided creation in progress. A DEVICE scratchpad like the last backup
 * date (AsyncStorage, never exported): there is no character row to hang it on
 * until « Démarrer ».
 */
const STORAGE_KEY = 'creation.draft';

export async function loadDraft(): Promise<CreationDraft | null> {
  return parseDraft(await AsyncStorage.getItem(STORAGE_KEY).catch(() => null));
}

export async function saveDraft(draft: Omit<CreationDraft, 'savedAt'>): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ ...draft, savedAt: Date.now() })).catch(() => {});
}

export async function clearDraft(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
}

/** The stored draft, re-read whenever the screen gains focus. */
export function useCreationDraft() {
  const [draft, setDraft] = useState<CreationDraft | null>(null);
  useFocusEffect(
    useCallback(() => {
      void loadDraft().then(setDraft);
    }, []),
  );
  return draft;
}
