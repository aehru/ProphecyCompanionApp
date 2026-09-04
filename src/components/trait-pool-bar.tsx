import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

import { useProphecyTheme } from '@/hooks/use-prophecy-theme';
import type { TraitPool } from '@/lib/trait-pool';

/**
 * The point pool, as three numbers: granted, spent, and what is left.
 *
 * ONE component for the character home and the catalogue picker, because they
 * show the same three numbers and a player reads the second one to decide what
 * the first one told them they could afford. Two copies would drift the moment
 * the wording or the colour of a debt changed.
 *
 * A negative balance is a real state (nothing enforces the pool), so it reads
 * « Dette » in the error colour rather than being hidden or clamped at zero.
 */
export default function TraitPoolBar({ pool }: { pool: TraitPool }) {
  const theme = useProphecyTheme();
  const owed = pool.balance < 0;

  return (
    <View style={[styles.root, { borderColor: theme.prophecy.borderSoft }]}>
      <Gauge label="Gagnés" value={pool.gained} color={theme.colors.onSurface} />
      <Gauge label="Dépensés" value={pool.spent} color={theme.colors.onSurface} />
      <Gauge
        label={owed ? 'Dette' : 'Restants'}
        value={owed ? -pool.balance : pool.balance}
        color={owed ? theme.colors.error : theme.colors.primary}
      />
    </View>
  );
}

function Gauge({ label, value, color }: { label: string; value: number; color: string }) {
  const theme = useProphecyTheme();
  return (
    <View style={styles.gauge}>
      <Text style={[styles.gaugeLabel, { color: theme.colors.onSurfaceVariant }]}>{label}</Text>
      <Text style={[styles.gaugeValue, { color }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
  },
  gauge: { alignItems: 'center', gap: 2 },
  gaugeLabel: { fontSize: 12 },
  gaugeValue: { fontFamily: 'Cinzel_600SemiBold', fontSize: 18 },
});
