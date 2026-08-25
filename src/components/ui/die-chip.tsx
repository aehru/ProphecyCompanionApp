import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';

import { useProphecyTheme } from '@/hooks/use-prophecy-theme';

/**
 * One rolled die, as a number in a bordered chip.
 *
 * Deliberately NOT the tendance die ([tendance-die.tsx](../tendance-die.tsx)):
 * that one is a d10 in a tendance's colours because the colour IS the tendance,
 * and a plain 3d6 has no colour to carry. Both roller bodies draw their dice
 * through this, so a die looks the same whether it came from « 3 × D6 » or from
 * a test.
 *
 * `muted` marks a confirmation die: it is drawn hollow because it never adds to
 * a total — it only says whether a 10 or a 1 was confirmed.
 */
export default function DieChip({
  value,
  muted,
  neutral,
  selected,
  onPress,
  accessibilityLabel,
  size = 40,
}: {
  value: number;
  muted?: boolean;
  /**
   * A die that cannot crit or fumble — every die of a throw but the one the
   * rules read (see `lib/roll` `isNeutralDie`). Drawn paler so « which die is
   * the 10 that counts » is answered by looking, not by remembering.
   */
  neutral?: boolean;
  /** The kept die of a `keep` throw: ringed, and never neutral. */
  selected?: boolean;
  onPress?: () => void;
  accessibilityLabel?: string;
  size?: number;
}) {
  const theme = useProphecyTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityState={onPress ? { selected: !!selected } : undefined}
      accessibilityLabel={onPress ? accessibilityLabel : undefined}
      style={({ pressed }) => [
        styles.die,
        {
          minWidth: size,
          height: size,
          borderColor: selected ? theme.colors.primary : theme.prophecy.border,
          borderWidth: selected ? 2 : 1,
          backgroundColor: muted ? 'transparent' : theme.colors.surfaceVariant,
          // The neutral dice step back rather than disappear: they still count
          // toward a sum, they just cannot be the die that crits.
          opacity: pressed ? 0.7 : neutral ? 0.5 : 1,
        },
      ]}>
      <Text
        style={[
          styles.text,
          // Derived, not a second prop: the number has to keep filling the chip
          // at whatever size the caller asked for.
          { fontSize: Math.round(size * 0.45) },
          { color: muted ? theme.colors.onSurfaceVariant : theme.colors.onSurface },
        ]}>
        {value}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  die: {
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  text: { fontFamily: 'Cinzel_600SemiBold' },
});
