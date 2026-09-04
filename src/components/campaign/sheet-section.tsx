// The section header used throughout the GM's character sheet: a gold label over
// a hairline. Lives on its own so both the sheet and the local-only sections it
// composes can use it without importing each other.

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Divider, Text } from 'react-native-paper';

import { useProphecyTheme } from '@/hooks/use-prophecy-theme';

export default function Section({
  title,
  children,
  testID,
}: {
  title: string;
  children: React.ReactNode;
  /** Names one block for the e2e suite (the GM sheet's gear sections use it). */
  testID?: string;
}) {
  const theme = useProphecyTheme();
  return (
    <View testID={testID} style={styles.section}>
      <Text variant="labelLarge" style={{ color: theme.colors.primary }}>
        {title}
      </Text>
      <Divider style={{ backgroundColor: theme.prophecy.border }} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: 8 },
});
