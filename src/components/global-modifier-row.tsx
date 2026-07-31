// What applies to EVERY roll, shown once for the whole character.
//
// A Prophecy roll is an attribut PLUS a caractéristique (Mental + Résistance,
// constantly). Badging the wound malus on both tiles therefore shows "-1 -1"
// for a single -1, which reads as -2 at the table. So the global sources come
// out of the tiles and live here instead, split by origin rather than summed —
// a GM asking "why -4?" gets the answer without opening the effects list.
//
// Tile badges keep only what is specific to their own stat (lib/modifiers
// `statModifier`); skill totals still fold everything in, since a skill roll
// uses one attribut and cannot double-count.

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

import { useProphecyTheme } from '@/hooks/use-prophecy-theme';
import { fmtSignedMod, type GlobalModifier } from '@/lib/modifiers';

/**
 * The « Tous les jets » strip: one pill per non-zero source. Renders nothing
 * when the character is unwounded and carries no global effect, so an untouched
 * sheet stays quiet.
 */
export default function GlobalModifierRow({
  modifier,
  compact = false,
}: {
  modifier: GlobalModifier;
  /** Tighter type scale, for a roster card rather than a full sheet. */
  compact?: boolean;
}) {
  const theme = useProphecyTheme();
  const sources = [
    { key: 'wound', label: 'Blessures', value: modifier.wound },
    { key: 'effects', label: 'Autres effets', value: modifier.effects },
  ].filter((s) => s.value !== 0);

  if (sources.length === 0) return null;

  return (
    <View style={styles.row}>
      <Text
        style={[
          styles.heading,
          { fontSize: compact ? 8 : 8.5, color: theme.colors.onSurfaceVariant },
        ]}>
        TOUS LES JETS
      </Text>
      {sources.map((s) => (
        <View
          key={s.key}
          style={[
            styles.pill,
            {
              borderColor: theme.prophecy.borderSoft,
              backgroundColor: theme.colors.surfaceVariant,
            },
          ]}>
          <Text
            style={[
              styles.pillLabel,
              { fontSize: compact ? 9 : 10, color: theme.colors.onSurfaceVariant },
            ]}>
            {s.label}
          </Text>
          <Text
            style={[
              styles.pillValue,
              {
                fontSize: compact ? 12 : 13,
                color: s.value > 0 ? theme.colors.primary : theme.colors.error,
              },
            ]}>
            {fmtSignedMod(s.value)}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  heading: { fontFamily: 'NotoSans_500Medium', letterSpacing: 1 },
  pill: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 5,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  pillLabel: { fontFamily: 'NotoSans_500Medium' },
  pillValue: { fontFamily: 'Cinzel_600SemiBold' },
});
