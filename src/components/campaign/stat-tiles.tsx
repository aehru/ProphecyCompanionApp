// The numbers on a roster card: attribut and caractéristique tiles, and the
// radial tendance dial. Pure presentation.

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

import { MAX_PUCES } from '@/constants/prophecy';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';
import { fmtSignedMod } from '@/lib/modifiers';

/**
 * The signed badge next to a stat, same reading as <StatChip> on the player's
 * own sheet: the effects aimed at THIS stat, green for a net bonus, red for a
 * net malus, nothing at all when it comes to 0. Wounds and 'all' effects are
 * deliberately absent — they hit every roll and are shown once by
 * <GlobalModifierRow>, since a roll uses two stats and would draw them twice.
 */
function ModBadge({ modifier }: { modifier?: number }) {
  const theme = useProphecyTheme();
  if (modifier == null || modifier === 0) return null;
  return (
    <Text
      style={[
        styles.mod,
        { color: modifier > 0 ? theme.colors.primary : theme.colors.error },
      ]}>
      {fmtSignedMod(modifier)}
    </Text>
  );
}

/** Attribut tile: value over label with a coloured top edge. */
export function AttrTile({
  label,
  value,
  color,
  modifier,
}: {
  label: string;
  value: number;
  color: string;
  /** Effects aimed at this attribut alone. 0/undefined hides the badge. */
  modifier?: number;
}) {
  const theme = useProphecyTheme();
  return (
    <View
      style={[
        styles.tile,
        {
          backgroundColor: theme.colors.surfaceVariant,
          borderColor: theme.prophecy.borderSoft,
          borderTopColor: color,
          borderTopWidth: 2,
        },
      ]}>
      <View style={styles.valueRow}>
        <Text style={{ fontFamily: 'Cinzel_600SemiBold', fontSize: 18, color }}>{value}</Text>
        <ModBadge modifier={modifier} />
      </View>
      <Text style={{ fontSize: 8.5, letterSpacing: 0.4, color: theme.colors.onSurfaceVariant }}>
        {label}
      </Text>
    </View>
  );
}

/** Caractéristique tile: abbr over value, plain surface. */
export function CaracTile({
  label,
  value,
  modifier,
}: {
  label: string;
  value: number;
  /** Effects aimed at this caractéristique alone. */
  modifier?: number;
}) {
  const theme = useProphecyTheme();
  return (
    <View
      style={[
        styles.tile,
        { backgroundColor: theme.colors.surfaceVariant, borderColor: theme.prophecy.borderSoft },
      ]}>
      <Text
        style={{ fontSize: 8.5, fontWeight: '700', letterSpacing: 0.5, color: theme.colors.onSurfaceVariant }}>
        {label}
      </Text>
      <View style={styles.valueRow}>
        <Text
          style={{ fontFamily: 'Cinzel_600SemiBold', fontSize: 14, color: theme.colors.onSurface }}>
          {value}
        </Text>
        <ModBadge modifier={modifier} />
      </View>
    </View>
  );
}

/**
 * Radial tendance dial. The ten dots fill from the 0–10 "Sub" value (`fill`);
 * the big centre number is the main tendance `value`. Trig mirrors the design's
 * `radial()` helper (start at −90°, 36° apart).
 */
export function TendanceRing({
  value,
  fill,
  color,
  size = 84,
}: {
  value: number;
  fill: number;
  color: string;
  size?: number;
}) {
  const theme = useProphecyTheme();
  const c = size / 2;
  const r = size * 0.39;
  const dot = size < 72 ? 6.5 : 8;
  return (
    <View style={{ width: size, height: size }}>
      {Array.from({ length: MAX_PUCES }, (_, i) => {
        const ang = ((-90 + i * 36) * Math.PI) / 180;
        const on = i < fill;
        return (
          <View
            key={i}
            style={{
              position: 'absolute',
              width: dot,
              height: dot,
              borderRadius: dot / 2,
              left: c + r * Math.cos(ang) - dot / 2,
              top: c + r * Math.sin(ang) - dot / 2,
              borderWidth: 1.5,
              borderColor: on ? color : theme.colors.outline,
              backgroundColor: on ? color : 'transparent',
            }}
          />
        );
      })}
      <View style={StyleSheet.absoluteFill}>
        <View style={styles.ringCenter}>
          <Text style={{ fontFamily: 'Cinzel_600SemiBold', fontSize: size * 0.26, color }}>
            {value}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    flexGrow: 1,
    flexBasis: 0,
    minWidth: 0,
    alignItems: 'center',
    gap: 1,
    paddingVertical: 7,
    borderRadius: 9,
    borderWidth: StyleSheet.hairlineWidth,
  },
  ringCenter: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  valueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 3 },
  mod: { fontFamily: 'NotoSans_500Medium', fontSize: 10 },
});
