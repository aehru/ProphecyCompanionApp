import React from 'react';
import { Pressable, type StyleProp, StyleSheet, View, type ViewStyle } from 'react-native';
import { Text, useTheme } from 'react-native-paper';

/**
 * A row of bullets (circles): `count` total, first `filled` are filled.
 * Used for wound boxes and tendance "puces".
 * Pass `onSet` to make them tappable (tap fills up to that bullet; tapping the
 * topmost filled one clears it). Omit `onSet` for a read-only preview.
 */
export default function Bullets({
  count,
  filled,
  onSet,
  color,
  size = 26,
  gap = 10,
  perRow,
  style,
}: {
  count: number;
  filled: number;
  onSet?: (n: number) => void;
  color?: string;
  size?: number;
  gap?: number;
  /** Cap bullets per line (wraps to the next line beyond it). */
  perRow?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  if (count <= 0) return <Text style={{ color: theme.colors.onSurfaceVariant }}>—</Text>;

  const maxWidth = perRow ? perRow * size + (perRow - 1) * gap : undefined;

  const fill = color ?? theme.colors.primary;
  const dotStyle = (isFilled: boolean) => [
    {
      width: size,
      height: size,
      borderRadius: size / 2,
      borderWidth: 2,
      borderColor: theme.colors.outline,
    },
    isFilled && { backgroundColor: fill, borderColor: fill },
  ];

  return (
    <View style={[styles.row, { gap, maxWidth }, style]}>
      {Array.from({ length: count }).map((_, i) => {
        const isFilled = i < filled;
        if (!onSet) return <View key={i} style={dotStyle(isFilled)} />;
        return (
          <Pressable key={i} hitSlop={6} onPress={() => onSet(i + 1 === filled ? i : i + 1)}>
            <View style={dotStyle(isFilled)} />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' },
});
