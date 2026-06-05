import { useGlobalSearchParams } from 'expo-router';

/**
 * Read the `[id]` route param as a number. Uses global params so it resolves
 * the parent dynamic segment even from nested tab screens (local params return
 * {} there).
 */
export function useCharacterId(): number {
  const { id } = useGlobalSearchParams<{ id: string }>();
  return Number(id);
}
