import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

import { useProphecyTheme } from '@/hooks/use-prophecy-theme';
import type { TraitPool } from '@/lib/trait-pool';

/**
 * The point pool, as the ONE number a player acts on: what is left to spend.
 *
 * Gagnés and dépensés are derivable by reading the two lists right below, and
 * nothing is decided from them — the balance alone answers « can I afford this
 * avantage ». Showing all three spent a card's worth of height restating a
 * subtraction, so only its result is drawn.
 *
 * ONE component for the character home and the catalogue picker, because they
 * show the same number and a player reads it in the second place to decide what
 * the first one told them they could afford.
 *
 * A negative balance is a real state (nothing enforces the pool), so it reads
 * « Dette » in the error colour rather than being hidden or clamped at zero.
 */
export default function TraitPoolBar({ pool }: { pool: TraitPool }) {
  const theme = useProphecyTheme();
  const owed = pool.balance < 0;

  return (
    <View style={styles.root}>
      <Text style={[styles.label, { color: theme.colors.onSurfaceVariant }]}>
        {owed ? 'Dette' : 'Points restants'}
      </Text>
      <Text
        style={[styles.value, { color: owed ? theme.colors.error : theme.colors.primary }]}>
        {owed ? -pool.balance : pool.balance}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  label: { fontSize: 12 },
  value: { fontFamily: 'Cinzel_600SemiBold', fontSize: 15 },
});
