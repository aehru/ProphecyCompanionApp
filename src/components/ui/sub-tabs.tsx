// The in-screen tab strip: Cinzel labels over a hairline, an ink bar under the
// active one. Three screens draw it (Magie, Inventaire, la Compagnie) — it lives
// here so they stay in sync instead of each keeping a copy.

import React from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Text } from 'react-native-paper';

import { useProphecyTheme } from '@/hooks/use-prophecy-theme';

export default function SubTabs({
  labels,
  active,
  onChange,
  style,
}: {
  labels: readonly string[];
  /** Index of the active tab. */
  active: number;
  onChange: (index: number) => void;
  /** Screen-level spacing only (margins); the strip owns its own look. */
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useProphecyTheme();
  return (
    <View style={[styles.tabs, { borderBottomColor: theme.prophecy.borderSoft }, style]}>
      {labels.map((label, i) => {
        const isActive = active === i;
        return (
          <Pressable key={label} style={styles.tab} onPress={() => onChange(i)}>
            <Text
              style={{
                fontFamily: 'Cinzel_600SemiBold',
                fontSize: 13,
                color: isActive ? theme.colors.primary : theme.colors.onSurfaceVariant,
              }}>
              {label}
            </Text>
            <View
              style={[
                styles.tabInk,
                { backgroundColor: isActive ? theme.colors.primary : 'transparent' },
              ]}
            />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  tabs: { flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth },
  tab: { flex: 1, alignItems: 'center', paddingTop: 10, gap: 8 },
  tabInk: { height: 2, alignSelf: 'stretch', borderRadius: 2 },
});
