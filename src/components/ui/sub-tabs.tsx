// The in-screen tab strip: Cinzel labels over a hairline, an ink bar under the
// active one. Three screens draw it (Magie, Inventaire, la Compagnie) — it lives
// here so they stay in sync instead of each keeping a copy.
//
// Two modes. On its own it draws a static ink bar under the active tab. Given a
// `progress` value (the pager's scroll position in pages, see <TabPager>), the
// ink bar becomes a single sliding one that follows the finger — which is what
// makes a swipe read as "I am dragging the tabs" rather than "the screen
// changed by itself".

import React, { useState } from 'react';
import {
  Animated,
  type LayoutChangeEvent,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Text } from 'react-native-paper';

import { useProphecyTheme } from '@/hooks/use-prophecy-theme';

export default function SubTabs({
  labels,
  active,
  onChange,
  style,
  progress,
}: {
  labels: readonly string[];
  /** Index of the active tab. */
  active: number;
  onChange: (index: number) => void;
  /** Screen-level spacing only (margins); the strip owns its own look. */
  style?: StyleProp<ViewStyle>;
  /** Live pager position, in pages (0 → first tab, 1.5 → halfway to the third). */
  progress?: Animated.AnimatedInterpolation<number>;
}) {
  const theme = useProphecyTheme();
  const [width, setWidth] = useState(0);
  const sliding = progress != null;
  const tabWidth = labels.length > 0 ? width / labels.length : 0;

  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  return (
    <View
      style={[styles.tabs, { borderBottomColor: theme.prophecy.borderSoft }, style]}
      onLayout={sliding ? onLayout : undefined}>
      {labels.map((label, i) => {
        const isActive = active === i;
        return (
          <Pressable key={label} style={styles.tab} onPress={() => onChange(i)}>
            <Text
              style={{
                fontFamily: 'Cinzel_600SemiBold',
                fontSize: 13,
                // Label colour follows the SETTLED tab, not the drag: flickering
                // colours mid-swipe read as a glitch, the moving bar carries the
                // gesture on its own.
                color: isActive ? theme.colors.primary : theme.colors.onSurfaceVariant,
              }}>
              {label}
            </Text>
            {/* Static mode draws its ink here; the sliding one is one view for
                the whole strip (below), so it can travel between tabs. */}
            {sliding ? (
              <View style={styles.tabInk} />
            ) : (
              <View
                style={[
                  styles.tabInk,
                  { backgroundColor: isActive ? theme.colors.primary : 'transparent' },
                ]}
              />
            )}
          </Pressable>
        );
      })}

      {sliding && tabWidth > 0 ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.slidingInk,
            {
              width: tabWidth,
              backgroundColor: theme.colors.primary,
              transform: [
                {
                  translateX: progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, tabWidth],
                  }),
                },
              ],
            },
          ]}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  tabs: { flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth },
  tab: { flex: 1, alignItems: 'center', paddingTop: 10, gap: 8 },
  tabInk: { height: 2, alignSelf: 'stretch', borderRadius: 2 },
  slidingInk: { position: 'absolute', bottom: 0, left: 0, height: 2, borderRadius: 2 },
});
