import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

import { useProphecyTheme } from '@/hooks/use-prophecy-theme';
import { fmtSignedMod } from '@/lib/modifiers';

/**
 * A labelled stat box. `modifier` (optional) renders a small signed badge — green
 * for a net bonus, red for a net malus — folding in wound malus + temporary
 * effects. Omitted or 0 → no badge.
 */
export default function StatChip({
  label,
  value,
  modifier,
}: {
  label: string;
  value: string;
  modifier?: number;
}) {
  const theme = useProphecyTheme();
  const showMod = modifier != null && modifier !== 0;
  return (
    <View style={[styles.chip, { borderColor: theme.colors.outlineVariant }]}>
      <Text style={[styles.label, { color: theme.colors.onSurfaceVariant }]}>{label}</Text>
      <View style={styles.valueRow}>
        <Text variant="titleMedium">{value}</Text>
        {showMod ? (
          <Text
            style={[
              styles.mod,
              { color: modifier > 0 ? theme.colors.primary : theme.colors.error },
            ]}>
            {fmtSignedMod(modifier)}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    minWidth: 64,
    alignItems: 'center',
  },
  label: { fontSize: 11, letterSpacing: 0.5 },
  valueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  mod: { fontSize: 12, fontWeight: '700' },
});
