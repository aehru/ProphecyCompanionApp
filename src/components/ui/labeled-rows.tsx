import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

import { useProphecyTheme } from '@/hooks/use-prophecy-theme';

/** `[label, value, muted?]` — an empty value drops the row. */
export type LabeledRow = [label: string, value: string | null | undefined, muted?: boolean];

/**
 * The stacked caption-over-body rows a rulebook entry is read in (Faveurs,
 * manœuvres): small uppercase label, paragraph under it. `muted` dims the body —
 * the verbatim rulebook paragraph sits behind the extracted mechanics.
 */
export default function LabeledRows({ rows }: { rows: LabeledRow[] }) {
  const theme = useProphecyTheme();
  return rows.map(([label, value, muted]) =>
    value ? (
      <View key={label} style={styles.row}>
        <Text style={[styles.label, { color: theme.colors.onSurfaceVariant }]}>{label}</Text>
        <Text
          style={[
            styles.body,
            { color: muted ? theme.colors.onSurfaceVariant : theme.colors.onSurface },
          ]}>
          {value}
        </Text>
      </View>
    ) : null,
  );
}

const styles = StyleSheet.create({
  row: { gap: 2 },
  label: { fontSize: 11, letterSpacing: 0.5, textTransform: 'uppercase' },
  body: { fontSize: 13, lineHeight: 19 },
});
