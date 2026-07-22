import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { IconButton } from 'react-native-paper';

import { GmRosterProvider } from '@/components/campaign/gm-roster-provider';
import { campaignQuery } from '@/repositories/campaigns';

/**
 * Campaign subtree: the Salon (index) and — for the GM — the Compagnie roster.
 * Draws its own headers (root marks this route headerShown:false). When the
 * user is the GM, the whole subtree is wrapped in a single roster socket so the
 * two screens share one connection (see GmRosterProvider).
 */
export default function CampaignLayout() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data } = useLiveQuery(campaignQuery(Number(id)), [id]);
  const campaign = data?.[0];

  const stack = (
    <Stack screenOptions={{ headerTitleStyle: { fontFamily: 'Cinzel_600SemiBold' } }}>
      {/* Salon is the nested stack's root, so it needs an explicit back to the
          campaigns list (a nested initial route draws no back arrow itself). */}
      <Stack.Screen
        name="index"
        options={{
          title: 'Campagne',
          headerLeft: () => (
            <IconButton icon="chevron-left" size={26} onPress={() => router.back()} />
          ),
        }}
      />
      <Stack.Screen name="compagnie" options={{ title: 'La Compagnie' }} />
    </Stack>
  );

  if (campaign?.role === 'gm') {
    return <GmRosterProvider campaign={campaign}>{stack}</GmRosterProvider>;
  }
  return stack;
}
