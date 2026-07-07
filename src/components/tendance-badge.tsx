import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

/** Colored circle holding a tendance value. Tap = +1, long-press = −1 (when editable). */
export default function TendanceBadge({
  value,
  color,
  textColor,
  border,
  size = 52,
  onPress,
  onLongPress,
}: {
  value: number;
  color: string;
  textColor: string;
  border: string;
  size?: number;
  onPress?: () => void;
  onLongPress?: () => void;
}) {
  const editable = !!(onPress || onLongPress);
  return (
    <Pressable onPress={onPress} onLongPress={onLongPress} disabled={!editable} hitSlop={6}>
      <View
        style={[
          styles.badge,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: color,
            borderColor: border,
          },
        ]}>
        <Text
          style={{ color: textColor, fontFamily: 'Cinzel_600SemiBold', fontSize: size * 0.42 }}>
          {value}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  badge: { borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
});
