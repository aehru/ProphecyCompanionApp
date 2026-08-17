// The caste pill. Shared by the character list and the fiche header so the two
// can't drift — same shape as the concept chip next to it, but ringed in the DS
// gold (`colors.secondary`) instead of the neutral hairline, because the caste
// is a closed set of eight and reads as a badge, where the concept is free text.
//
// Renders NOTHING for a NULL caste: « Sans Caste » is a real choice, and a chip
// saying so would shout the absence of a label on every unfilled sheet.

import React from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { Text } from 'react-native-paper';

import { CASTE_LABEL } from '@/constants/prophecy';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';

export default function CasteChip({
  caste,
  style,
}: {
  caste?: string | null;
  style?: ViewStyle;
}) {
  const theme = useProphecyTheme();
  if (!caste) return null;
  return (
    <View style={[styles.chip, { borderColor: theme.colors.secondary }, style]}>
      <Text style={[styles.text, { color: theme.colors.secondary }]} numberOfLines={1}>
        {/* An unknown key can only come from a hand-edited file — show it raw
            rather than dropping the row's only caste information. */}
        {CASTE_LABEL[caste] ?? caste}
      </Text>
    </View>
  );
}

// Geometry and type are the concept chip's, to the pixel (see the fiche header's
// `conceptChip`): the two sit side by side, so anything else would read as a
// misalignment rather than a distinction. The gold ring is the ONLY difference.
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
