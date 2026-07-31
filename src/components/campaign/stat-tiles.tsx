// The numbers on a roster card: attribut and caractéristique tiles, and the
// radial tendance dial. Pure presentation.

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

import { MAX_PUCES } from '@/constants/prophecy';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';

/** Attribut tile: value over label with a coloured top edge. */
export function AttrTile({ label, value, color }: { label: string; value: number; color: string }) {
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
      <Text style={{ fontFamily: 'Cinzel_600SemiBold', fontSize: 18, color }}>{value}</Text>
      <Text style={{ fontSize: 8.5, letterSpacing: 0.4, color: theme.colors.onSurfaceVariant }}>
        {label}
      </Text>
    </View>
  );
}

/** Caractéristique tile: abbr over value, plain surface. */
export function CaracTile({ label, value }: { label: string; value: number }) {
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
      <Text
        style={{ fontFamily: 'Cinzel_600SemiBold', fontSize: 14, color: theme.colors.onSurface }}>
        {value}
      </Text>
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
});
