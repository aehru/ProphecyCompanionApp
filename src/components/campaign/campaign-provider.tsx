// The campaign row, for the whole `campaigns/[id]` subtree.
//
// The layout resolves it once (and owns the loading / not-found screens); the
// Salon and the Compagnie read it from here instead of each running the same
// `campaignQuery` and re-guarding a state the layout already settled. Still
// live: the layout's query re-renders on a write, and the new row flows down.

import React, { createContext, useContext } from 'react';

import type { Campaign } from '@/db/schema';

const CampaignContext = createContext<Campaign | null>(null);

export function CampaignProvider({
  campaign,
  children,
}: {
  campaign: Campaign;
  children: React.ReactNode;
}) {
  return <CampaignContext.Provider value={campaign}>{children}</CampaignContext.Provider>;
}

/** The subtree's campaign. Throws outside `campaigns/[id]`. */
export function useCampaign(): Campaign {
  const campaign = useContext(CampaignContext);
  if (!campaign) throw new Error('useCampaign must be used within a CampaignProvider');
  return campaign;
}
