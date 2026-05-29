import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';

export default function StatChip({ label, value }: { label: string; value: string }) {
  const theme = useTheme();
  return (
    <View style={[styles.chip, { borderColor: theme.colors.outlineVariant }]}>
      <Text style={[styles.label, { color: theme.colors.onSurfaceVariant }]}>{label}</Text>
      <Text variant="titleMedium">{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    minWidth: 64,
    alignItems: 'center',
  },
  label: { fontSize: 11, letterSpacing: 0.5 },
});
