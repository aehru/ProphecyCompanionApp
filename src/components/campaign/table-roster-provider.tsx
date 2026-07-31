// The table roster, for the whole campaign subtree. Two sources, one list:
//  - LOCAL: the GM's own NPCs, read from this device's DB — always there, no
//    network (use-local-roster);
//  - REMOTE: the players' characters, streamed by the relay when one is
//    attached (use-gm-roster).
//
// It lives in a provider (mounted by campaigns/[id]/_layout) because the Salon
// and the Compagnie are two routes that must not open two GM sockets for the
// same gmToken.

import React, { createContext, useContext } from 'react';

import type { Campaign } from '@/db/schema';
import { useGmRoster } from '@/hooks/use-gm-roster';
import { useLocalRoster } from '@/hooks/use-local-roster';
import { mergeRoster, type TableRosterEntry } from '@/lib/roster-merge';

interface TableRoster extends Omit<ReturnType<typeof useGmRoster>, 'roster'> {
  roster: TableRosterEntry[];
  /** Whether a relay server is attached (drives the whole online-ness of the UI). */
  connected: boolean;
}

const TableRosterContext = createContext<TableRoster | null>(null);

export function TableRosterProvider({
  campaign,
  children,
}: {
  campaign: Campaign;
  children: React.ReactNode;
}) {
  const local = useLocalRoster(campaign.id);
  // Connects only when a server is attached — see useGmRoster's own guard.
  const { status, serverError, roster: remote, kick } = useGmRoster(campaign);
  const roster = mergeRoster(local, remote);
  const connected = Boolean(campaign.serverUrl && campaign.code && campaign.gmToken);
  return (
    <TableRosterContext.Provider value={{ status, serverError, roster, kick, connected }}>
      {children}
    </TableRosterContext.Provider>
  );
}

/** Read the table roster. Throws if used outside a GM subtree. */
export function useTableRosterCtx(): TableRoster {
  const ctx = useContext(TableRosterContext);
  if (!ctx) throw new Error('useTableRosterCtx must be used within a TableRosterProvider');
  return ctx;
}
