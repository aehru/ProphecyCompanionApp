import { createContext, useContext } from 'react';

import type { ActualState, Character } from '@/db/schema';

export type StatusApi = {
  char: Character;
  state: ActualState;
  persistState: (patch: Partial<ActualState>) => void;
  persistChar: (patch: Partial<Character>) => void;
  /** Set one numeric actual_state column by key (centralizes the cast). */
  setStateValue: (key: string, value: number) => void;
  /** Set one numeric character column by key (centralizes the cast). */
  setCharValue: (key: string, value: number) => void;
};

export const StatusContext = createContext<StatusApi | null>(null);

export function useStatus(): StatusApi {
  const ctx = useContext(StatusContext);
  if (!ctx) throw new Error('useStatus must be used within the status layout');
  return ctx;
}
