// One shared GM roster socket for the whole campaign subtree. The Salon and the
// Compagnie screens are two routes but must not open two GM connections for the
// same gmToken, so the socket lives here (mounted by campaigns/[id]/_layout) and
// both screens read it through context.

import React, { createContext, useContext } from 'react';

import type { Campaign } from '@/db/schema';
import { useGmRoster } from '@/hooks/use-gm-roster';

type GmRoster = ReturnType<typeof useGmRoster>;

const GmRosterContext = createContext<GmRoster | null>(null);

export function GmRosterProvider({
  campaign,
  children,
}: {
  campaign: Campaign;
  children: React.ReactNode;
}) {
  const roster = useGmRoster(campaign);
  return <GmRosterContext.Provider value={roster}>{children}</GmRosterContext.Provider>;
}

/** Read the shared GM roster. Throws if used outside a GM subtree. */
export function useGmRosterCtx(): GmRoster {
  const ctx = useContext(GmRosterContext);
  if (!ctx) throw new Error('useGmRosterCtx must be used within a GmRosterProvider');
  return ctx;
}
