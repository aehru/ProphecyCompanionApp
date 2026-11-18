// One row of a distribution step: the name (with a small caption above), a chip
// per distinct pool value, and the resulting final value. Shared by the
// caractéristiques (7/6/6/5/5/4/4/3) and the attributs (the age's four values).

import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

import { useProphecyTheme } from '@/hooks/use-prophecy-theme';

export default function ValuePickRow({
  caption,
  label,
  values,
  mine,
  left,
  final,
  onPick,
  testID,
}: {
  /** Small line above the name: « FOR −2 », « FOR + RÉS 13 → +1 ». */
  caption: string;
  label: string;
  /** One chip per distinct value, in display order. */
  values: readonly number[];
  mine: number | undefined;
  /** Still to hand out — a value missing here is held elsewhere (tap swaps it). */
  left: readonly number[];
  final: number | null;
  onPick: (n: number) => void;
  testID?: string;
}) {
  const theme = useProphecyTheme();
  const c = theme.colors;
  return (
    <View style={styles.row} testID={testID}>
      <View style={styles.name}>
        <Text style={[styles.caption, { color: c.onSurfaceVariant }]} numberOfLines={1}>
          {caption}
        </Text>
        <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={styles.label}>
          {label}
        </Text>
      </View>
      <View style={styles.chips}>
        {values.map((n) => {
          const on = mine === n;
          const free = on || left.includes(n);
          return (
            <Pressable
              key={n}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              accessibilityLabel={`${label} : ${n}`}
              onPress={() => onPick(n)}
              style={[
                styles.chip,
                {
                  backgroundColor: on ? c.primary : 'transparent',
                  borderColor: on ? c.primary : free ? theme.prophecy.border : theme.prophecy.borderSoft,
                },
              ]}>
              <Text
                style={{
                  color: on ? c.onPrimary : free ? c.onSurface : c.onSurfaceDisabled,
                  fontWeight: '600',
                }}>
                {n}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Text variant="titleMedium" style={styles.final}>
        {final ?? '—'}
      </Text>
    </View>
  );
}

/** The banner on top of a distribution step: what is still to hand out. */
export function PoolBanner({
  left,
  note,
  title,
}: {
  left: readonly number[];
  note: string;
  /** Overrides the « À répartir » line (a points budget rather than values). */
  title?: string;
}) {
  const theme = useProphecyTheme();
  return (
    <View
      style={[
        styles.banner,
        { backgroundColor: theme.colors.secondaryContainer, borderColor: theme.prophecy.border },
      ]}>
      <Text variant="titleMedium" testID="pool-left">
        {title ??
          (left.length ? `À répartir : ${left.join(' · ')}` : 'Toutes les valeurs sont réparties')}
      </Text>
      <Text style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center' }}>{note}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: { alignItems: 'center', padding: 12, borderRadius: 14, borderWidth: 1, gap: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { flex: 1, minWidth: 0 },
  caption: { fontSize: 10, letterSpacing: 0.6 },
  label: { fontSize: 13 },
  chips: { flexDirection: 'row', gap: 4 },
  chip: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  final: { width: 28, textAlign: 'center' },
});
