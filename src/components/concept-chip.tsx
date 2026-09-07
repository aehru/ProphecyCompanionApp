// The concept pill — the free-text half of the identity pair. Extracted from
// the dashboard hero when the portrait hero started drawing the same chips over
// an image: geometry and type are `CasteChip`'s to the pixel (the two sit side
// by side), the neutral hairline instead of the gold ring being the ONLY
// difference, since a concept is free text where a caste is a closed set.
//
// Renders NOTHING for an empty concept, like its neighbour.

import React from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { Text } from 'react-native-paper';

import { type ChipTone } from '@/components/caste-chip';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';

// See `CasteChip`'s OVERLAY_GOLD: on a scrim over a photograph the ink is
// fixed, because the theme's own muted roles are tuned for a surface.
const OVERLAY_BORDER = 'rgba(232,228,214,0.55)';
const OVERLAY_TEXT = '#E8E4D6';

export default function ConceptChip({
  concept,
  style,
  tone = 'surface',
}: {
  concept?: string | null;
  style?: ViewStyle;
  tone?: ChipTone;
}) {
  const theme = useProphecyTheme();
  if (!concept) return null;
  const overlay = tone === 'overlay';
  return (
    <View
      testID="concept-chip"
      style={[
        styles.chip,
        { borderColor: overlay ? OVERLAY_BORDER : theme.prophecy.border },
        style,
      ]}>
      <Text
        style={[styles.text, { color: overlay ? OVERLAY_TEXT : theme.colors.onSurfaceVariant }]}
        numberOfLines={1}>
        {concept}
      </Text>
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
