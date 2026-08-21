// A field label with a « i » that reveals what the field actually does.
//
// Inline disclosure rather than a tooltip or a dialog: a tooltip needs a hover
// no phone has, and a dialog to explain a chip row costs a modal to read one
// sentence. Tapping the glyph pushes the explanation in above the control and
// tapping it again takes it away, so nothing is hidden behind a gesture and
// nothing is permanently in the way.

import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { IconButton, Text } from 'react-native-paper';

import { useProphecyTheme } from '@/hooks/use-prophecy-theme';

export default function InfoLabel({
  label,
  info,
  testID,
}: {
  label: string;
  /** The explanation. Omitted — no glyph, so a caller can pass it conditionally. */
  info?: string;
  /** E2E hook for the glyph itself; the panel gets `${testID}-panel`. */
  testID?: string;
}) {
  const theme = useProphecyTheme();
  const [open, setOpen] = useState(false);
  return (
    <View style={styles.root}>
      <View style={styles.row}>
        <Text style={[styles.label, { color: theme.colors.onSurfaceVariant }]}>{label}</Text>
        {info ? (
          <IconButton
            icon="information-outline"
            size={14}
            style={styles.glyph}
            accessibilityLabel={`À propos de ${label}`}
            accessibilityState={{ expanded: open }}
            testID={testID}
            onPress={() => setOpen((o) => !o)}
          />
        ) : null}
      </View>
      {info && open ? (
        <Text
          variant="bodySmall"
          testID={testID ? `${testID}-panel` : undefined}
          style={[
            styles.info,
            {
              color: theme.colors.onSurfaceVariant,
              backgroundColor: theme.prophecy.surfaceContainerLow,
              borderColor: theme.colors.outlineVariant,
            },
          ]}>
          {info}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 4 },
  row: { flexDirection: 'row', alignItems: 'center' },
  // Matches the label ChipSelect and NumberField already draw, to the pixel.
  label: { fontSize: 12 },
  // Paper's IconButton ships a 40dp touch target with its own margins; strip the
  // margins so the glyph sits ON the label line, and keep the target.
  glyph: { margin: 0, marginLeft: 2, width: 24, height: 24 },
  info: { padding: 8, borderRadius: 10, borderWidth: 1 },
});
