import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Chip, Text } from 'react-native-paper';

import { useProphecyTheme } from '@/hooks/use-prophecy-theme';

type Option = { key: string; label: string };

/**
 * Compact single-select as a wrap of chips. Used for enum weapon/spell fields
 * (discipline, sphere, time unit) — reads better than a native picker for a
 * handful of options and matches the DS.
 */
export default function ChipSelect({
  label,
  options,
  value,
  onChange,
}: {
  label?: string;
  options: readonly Option[];
  value: string;
  onChange: (key: string) => void;
}) {
  const theme = useProphecyTheme();
  return (
    <View style={styles.root}>
      {label ? (
        <Text style={[styles.label, { color: theme.colors.onSurfaceVariant }]}>{label}</Text>
      ) : null}
      <View style={styles.chips}>
        {options.map((o) => (
          <Chip
            key={o.key}
            compact
            selected={value === o.key}
            showSelectedCheck={false}
            mode={value === o.key ? 'flat' : 'outlined'}
            onPress={() => onChange(o.key)}>
            {o.label}
          </Chip>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 6 },
  label: { fontSize: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
