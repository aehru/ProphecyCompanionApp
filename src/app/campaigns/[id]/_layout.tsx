import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { type Href, router, Stack, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Button, IconButton, Text } from 'react-native-paper';

import { TableRosterProvider } from '@/components/campaign/table-roster-provider';
import { campaignQuery } from '@/repositories/campaigns';

/**
 * Campaign subtree: the Salon (index) and — for the GM — the Compagnie roster.
 * Draws its own headers (root marks this route headerShown:false). When the
 * user is the GM, the whole subtree is wrapped in one roster provider: the local
 * NPCs plus, when a relay is attached, a single shared socket for both screens
 * (see TableRosterProvider).
 */
export default function CampaignLayout() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, updatedAt } = useLiveQuery(campaignQuery(Number(id)), [id]);
  const campaign = data?.[0];

  // Nothing may mount before the row is read: the screens consume the roster
  // context, and child effects run BEFORE the parent's — so a screen would
  // resolve its own campaignQuery first and render outside the provider
  // (« useTableRosterCtx must be used within a TableRosterProvider »).
  // `updatedAt` is undefined only while the first query is in flight.
  if (updatedAt === undefined) {
    return (
      <View testID="campaign-loading" style={styles.centered}>
        <ActivityIndicator />
      </View>
    );
  }

  // Row read, nothing there: a bad id, or the table was deleted while open.
  // Answered once for the whole subtree — the screens below only ever guard
  // their own (transient) loading, so leaving them to it would spin forever.
  if (!campaign) {
    return (
      <View style={styles.centered}>
        <Text testID="campaign-not-found" variant="bodyMedium">
          Campagne introuvable.
        </Text>
        <Button mode="text" onPress={() => router.replace('/campaigns' as Href)}>
          Retour aux campagnes
        </Button>
      </View>
    );
  }

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

  if (campaign.role === 'gm') {
    return <TableRosterProvider campaign={campaign}>{stack}</TableRosterProvider>;
  }
  return stack;
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, padding: 24 },
});
