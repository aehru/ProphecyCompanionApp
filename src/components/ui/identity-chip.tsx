import React from 'react';
import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import { Text } from 'react-native-paper';

/**
 * The identity pill: caste, Statut, concept. ONE geometry, three users.
 *
 * They sit side by side under a character's name, so anything but identical
 * geometry reads as a misalignment rather than a distinction — which is why the
 * three used to carry the same style block verbatim, kept in step by a comment
 * in each saying « to the pixel ». This is that comment, enforced.
 *
 * What stays with each chip is what actually differs: its colours, its content,
 * and the rule for when it renders nothing at all.
 *
 * `onPress` turns it into a button. Only the Statut takes one today (it opens
 * the rung) — the others are labels, and a Pressable with no handler would give
 * a tappable look to something that does nothing.
 */
export type ChipTone = 'surface' | 'overlay';

export default function IdentityChip({
  label,
  color,
  borderColor = color,
  fill,
  onPress,
  accessibilityLabel,
  testID,
  style,
}: {
  label: string;
  /** Text ink. Also the ring, unless `borderColor` says otherwise. */
  color: string;
  borderColor?: string;
  /** Optional wash behind the label — what sets two same-coloured chips apart. */
  fill?: string;
  onPress?: () => void;
  accessibilityLabel?: string;
  testID?: string;
  style?: ViewStyle;
}) {
  const chipStyle = [styles.chip, { borderColor, backgroundColor: fill }, style];
  const text = (
    <Text style={[styles.text, { color }]} numberOfLines={1}>
      {label}
    </Text>
  );

  if (onPress) {
    return (
      <Pressable
        testID={testID}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        style={chipStyle}>
        {text}
      </Pressable>
    );
  }
  return (
    <View testID={testID} style={chipStyle}>
      {text}
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignSelf: 'flex-start',
    flexShrink: 1,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 4,
    maxWidth: '100%',
  },
  text: { fontSize: 12 },
});
