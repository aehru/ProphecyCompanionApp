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

/**
 * Same chip wrap, multi-select — used where an item carries a SET of values
 * rather than one (a spell's tags). Tapping a chip toggles it; the callback gets
 * the whole next list, in the options' own order so two spells with the same
 * tags always render them the same way.
 */
export function ChipMultiSelect({
  label,
  options,
  values,
  onChange,
}: {
  label?: string;
  options: readonly Option[];
  values: readonly string[];
  onChange: (keys: string[]) => void;
}) {
  const theme = useProphecyTheme();
  const selected = new Set(values);
  const toggle = (key: string) => {
    const next = new Set(selected);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    onChange(options.filter((o) => next.has(o.key)).map((o) => o.key));
  };
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
            selected={selected.has(o.key)}
            showSelectedCheck={false}
            mode={selected.has(o.key) ? 'flat' : 'outlined'}
            onPress={() => toggle(o.key)}>
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
