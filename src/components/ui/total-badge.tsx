import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';

import { useProphecyTheme } from '@/hooks/use-prophecy-theme';

/**
 * The score a player needs at a glance, on a collapsed gear row: a spell's
 * casting total, a weapon's attack total. It stays on the row rather than
 * waiting for the expand, which is the whole reason it exists.
 *
 * One component so the two never drift: a weapon and a spell carry the same
 * number in the same place, and a card that grows a total later gets the badge
 * rather than a third rendering of it.
 *
 * `onPress` makes it the roll button. The badge lives INSIDE the row that
 * expands the card, so this is a deliberate nested touch target: the number
 * rolls, everything around it expands. Without a handler it is inert and
 * announces itself as a reading, not a button.
 */
export default function TotalBadge({
  value,
  onPress,
  accessibilityLabel,
}: {
  value: number | string;
  onPress?: () => void;
  accessibilityLabel?: string;
}) {
  const theme = useProphecyTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      // The badge is ~34×24 — comfortably readable, well under a thumb. The slop
      // buys back a real touch target without growing the row. Kept modest, and
      // NOT applied to the skills table's TOT badge: rows there are 10dp apart,
      // where overlapping slop would roll the neighbouring compétence.
      hitSlop={onPress ? { top: 10, bottom: 10, left: 8, right: 8 } : undefined}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [
        styles.badge,
        {
          backgroundColor: theme.colors.surface,
          borderColor: onPress ? theme.colors.primary : theme.prophecy.borderSoft,
          opacity: pressed ? 0.7 : 1,
        },
      ]}>
      <Text style={[styles.value, { color: theme.colors.primary }]}>{value}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  badge: {
    minWidth: 34,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 9,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: { fontSize: 15, fontWeight: '700' },
});
