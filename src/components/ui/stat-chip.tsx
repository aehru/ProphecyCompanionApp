import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Text } from 'react-native-paper';

import { useProphecyTheme } from '@/hooks/use-prophecy-theme';
import { fmtSignedMod } from '@/lib/modifiers';

/**
 * A labelled stat box. `modifier` (optional) renders a small signed badge — green
 * for a net bonus, red for a net malus — folding in wound malus + temporary
 * effects. Omitted or 0 → no badge. `style` lets the parent size it as a grid
 * column (e.g. flexGrow to fill the row).
 */
export default function StatChip({
  label,
  value,
  modifier,
  style,
}: {
  label: string;
  value: string;
  modifier?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useProphecyTheme();
  const showMod = modifier != null && modifier !== 0;
  return (
    <View
      style={[
        styles.chip,
        {
          borderColor: theme.prophecy.borderSoft,
          backgroundColor: theme.colors.surfaceVariant,
        },
        style,
      ]}>
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.6}
        style={[styles.label, { color: theme.colors.secondary }]}>
        {label}
      </Text>
      <View style={styles.valueRow}>
        <Text variant="titleMedium" style={styles.value}>
          {value}
        </Text>
        {showMod ? (
          <Text
            style={[
              styles.mod,
              { color: modifier > 0 ? theme.colors.primary : theme.colors.error },
            ]}>
            {fmtSignedMod(modifier)}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // DS tile: 1px soft gold hairline, 10px radius, tonal parchment fill.
  chip: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    minWidth: 64,
    alignItems: 'center',
    overflow: 'hidden',
  },
  // Engraved label: Noto Sans, uppercase, widely tracked, gold. Stretched to the
  // chip width + centered, giving adjustsFontSizeToFit room to shrink long
  // labels ("Physique") onto one line instead of clipping.
  label: {
    alignSelf: 'stretch',
    textAlign: 'center',
    fontFamily: 'NotoSans_500Medium',
    fontSize: 8,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  valueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  // value inherits Cinzel via the titleMedium variant.
  value: { fontSize: 18 },
  mod: { fontFamily: 'NotoSans_500Medium', fontSize: 12 },
});
