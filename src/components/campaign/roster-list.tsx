// The roster as a list of cards — one instance per swipeable tab, so the pager
// can lay them side by side. Every tab shows the same characters; `tab` only
// decides which body each card draws.

import React from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

import CompanyCard from '@/components/campaign/company-card';
import { contentWidth } from '@/hooks/use-layout';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';
import type { RosterEntry } from '@/lib/campaign-protocol';
import type { TableRosterEntry } from '@/lib/roster-merge';

// Module-level so FlatList sees the same component type on every render (an
// inline arrow remounts every separator whenever the screen re-renders — and
// with a live roster it re-renders on every player push).
const CardSeparator = () => <View style={styles.separator} />;
const keyExtractor = (e: RosterEntry) => e.charId;

export default function RosterList({
  roster,
  tab,
  query,
  notedUuids,
  bottomInset,
  stale = false,
  onSelect,
}: {
  roster: TableRosterEntry[];
  /** Which card body to draw (0 stats, 1 skills, 2 tendances). */
  tab: number;
  query: string;
  /** Characters the GM wrote a private note about — drives the 📝 marker. */
  notedUuids: Set<string>;
  bottomInset: number;
  /** Cards still showing results for an older query — dimmed while catching up. */
  stale?: boolean;
  onSelect: (entry: TableRosterEntry) => void;
}) {
  const theme = useProphecyTheme();

  if (roster.length === 0) {
    return (
      <View style={styles.centered}>
        <Text
          variant="bodyMedium"
          style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center', paddingHorizontal: 32 }}>
          Aucun personnage à la table. Ajoutez des PNJ depuis le salon.
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={roster}
      keyExtractor={keyExtractor}
      // flex: 1 claims the remaining height; the bottom inset keeps the last
      // card clear of the gesture area.
      style={[styles.listFill, stale ? styles.listStale : null]}
      contentContainerStyle={[styles.list, { paddingBottom: bottomInset }, contentWidth]}
      ItemSeparatorComponent={CardSeparator}
      // Cards are tall (rings / skill groups): render a screenful, not the whole
      // table, and drop off-screen rows on Android.
      initialNumToRender={4}
      maxToRenderPerBatch={4}
      windowSize={5}
      removeClippedSubviews
      // A roster push leaves `roster` a new array, but typing in the search box
      // does not — tell the list that affects every row.
      extraData={query}
      renderItem={({ item }) => (
        <CompanyCard
          entry={item}
          tab={tab}
          query={query}
          hasNote={notedUuids.has(item.charId)}
          onPress={() => onSelect(item)}
        />
      )}
    />
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  listFill: { flex: 1 },
  listStale: { opacity: 0.6 },
  list: { padding: 16 },
  separator: { height: 12 },
});
