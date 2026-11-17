import React from 'react';
import { StyleSheet, View } from 'react-native';

import { useProphecyTheme } from '@/hooks/use-prophecy-theme';

/**
 * Rows grouped in one bordered surface, split by inset hairlines — the
 * character list and the campaign list. Rows draw no border of their own.
 */
export default function GroupedList({
  children,
  testID,
}: {
  children: React.ReactNode;
  testID?: string;
}) {
  const theme = useProphecyTheme();
  const rows = React.Children.toArray(children);
  return (
    <View
      testID={testID}
      style={[
        styles.list,
        {
          backgroundColor: theme.prophecy.surfaceContainerLow,
          borderColor: theme.prophecy.border,
        },
      ]}>
      {rows.map((row, i) => (
        <React.Fragment key={i}>
          {i > 0 ? (
            <View style={[styles.divider, { backgroundColor: theme.prophecy.borderSoft }]} />
          ) : null}
          {row}
        </React.Fragment>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { borderRadius: 18, borderWidth: 1, overflow: 'hidden' },
  divider: { height: 1, marginHorizontal: 16 },
});
