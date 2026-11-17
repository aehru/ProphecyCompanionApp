import React from 'react';
import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';

import Icon from '@/components/ui/icon';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';

/**
 * One option of a single-choice step (an age band, a caste): a bordered card,
 * thicker border + check when selected. `accent` colours both and adds the 3dp
 * top bar the caste cards carry.
 */
export default function ChoiceCard({
  selected,
  accent,
  onPress,
  testID,
  style,
  children,
}: {
  selected: boolean;
  accent?: string;
  onPress: () => void;
  testID?: string;
  style?: ViewStyle;
  children: React.ReactNode;
}) {
  const theme = useProphecyTheme();
  const color = accent ?? theme.colors.primary;
  return (
    <Pressable
      testID={testID}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.surface,
          borderColor: selected ? color : theme.prophecy.border,
          borderWidth: selected ? 1.5 : 1,
        },
        accent ? styles.withBar : null,
        style,
      ]}>
      {accent ? <View style={[styles.bar, { backgroundColor: accent }]} /> : null}
      <View style={styles.body}>{children}</View>
      {selected ? (
        <View style={styles.check}>
          <Icon name="check" size={18} color={color} />
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10, overflow: 'hidden' },
  withBar: { paddingTop: 14 },
  bar: { position: 'absolute', left: 0, right: 0, top: 0, height: 3 },
  // Room on the right for the check, so a long name never runs under it.
  body: { paddingRight: 22, gap: 2 },
  check: { position: 'absolute', right: 10, top: 12 },
});
