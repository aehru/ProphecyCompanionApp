import React from 'react';
import { StyleSheet, View } from 'react-native';
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
  size = 40,
}: {
  value: number;
  muted?: boolean;
  size?: number;
}) {
  const theme = useProphecyTheme();
  return (
    <View
      style={[
        styles.die,
        {
          minWidth: size,
          height: size,
          borderColor: theme.prophecy.border,
          backgroundColor: muted ? 'transparent' : theme.colors.surfaceVariant,
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
    </View>
  );
}

const styles = StyleSheet.create({
  die: {
    borderWidth: 1,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  text: { fontFamily: 'Cinzel_600SemiBold' },
});
