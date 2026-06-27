import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

import { useProphecyTheme } from '@/hooks/use-prophecy-theme';

/**
 * Prophecy Mobile DS card: a flat parchment surface with a 1px gold hairline
 * (`prophecy.border`), 16px radius, 20px padding and a very soft drop shadow.
 * The section title is the engraved eyebrow — Cinzel (via titleSmall), primary,
 * uppercase, widely tracked.
 */
export default function SectionCard({
  title,
  children,
  helper,
}: {
  title: string;
  helper?: string;
  children: React.ReactNode;
}) {
  const theme = useProphecyTheme();
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.prophecy.border,
        },
      ]}>
      <View style={styles.header}>
        <Text
          variant="titleSmall"
          style={[styles.title, { color: theme.colors.primary }]}>
          {title}
        </Text>
        {helper ? (
          <Text
            variant="titleSmall"
            style={[styles.helper, { color: theme.colors.onSurfaceVariant }]}>
            {helper}
          </Text>
        ) : null}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    gap: 8,
    // DS --shadow: barely-there lift on the parchment.
    ...Platform.select({
      ios: {
        shadowColor: '#2F241A',
        shadowOpacity: 0.07,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 8 },
      },
      android: { elevation: 1 },
      default: {},
    }),
  },
  header: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  title: { letterSpacing: 1.6, textTransform: 'uppercase' },
  helper: { flexShrink: 1, fontSize: 12 },
});
