// The in-screen tab strip: Cinzel labels over a hairline, an ink bar under the
// active one. Four screens draw it (Compétences, Magie, Inventaire, la
// Compagnie) — it lives here so they stay in sync instead of each keeping a copy.
//
// Two modes. On its own it draws a static ink bar under the active tab. Given a
// `progress` value (the pager's scroll position in pages, see <TabPager>), the
// ink bar becomes a single sliding one that follows the finger — which is what
// makes a swipe read as "I am dragging the tabs" rather than "the screen
// changed by itself".
//
// LABELS THAT DON'T FIT: tabs stay equal columns, so the words adapt. A tab may
// carry a shorter form ({ full, short }); the strip falls back to the short
// forms — all of them at once, a half-abbreviated row reads as a bug — when the
// full ones don't fit the column. "Fit" is measured against THIS strip (the
// Compagnie's lives in a split pane, not the window) and against the user's
// font scale, so 130% text triggers the same fallback as a narrow screen.

import React, { useState } from 'react';
import {
  Animated,
  type LayoutChangeEvent,
  Pressable,
  StyleSheet,
  type TextLayoutEventData,
  useWindowDimensions,
  View,
  type NativeSyntheticEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Text } from 'react-native-paper';

import { useProphecyTheme } from '@/hooks/use-prophecy-theme';

/** A tab label, with an optional shorter form for narrow columns. */
export type TabLabel = string | { full: string; short: string };

export const labelKey = (label: TabLabel): string =>
  typeof label === 'string' ? label : label.full;

const labelText = (label: TabLabel, compact: boolean): string =>
  typeof label === 'string' ? label : compact ? label.short : label.full;

const FONT_SIZE = 13;
// Cinzel is wider than a system font; ~0.58em per character is a good enough
// first guess to pick the right form on the FIRST paint. The real measurement
// (onTextLayout, below) corrects it either way — this only avoids a visible
// swap from full to short on mount.
const CHAR_WIDTH = FONT_SIZE * 0.58;

export default function SubTabs({
  labels,
  active,
  onChange,
  style,
  progress,
  right,
}: {
  labels: readonly TabLabel[];
  /** Index of the active tab. */
  active: number;
  onChange: (index: number) => void;
  /** Screen-level spacing only (margins); the strip owns its own look. */
  style?: StyleProp<ViewStyle>;
  /** Live pager position, in pages (0 → first tab, 1.5 → halfway to the third). */
  progress?: Animated.AnimatedInterpolation<number>;
  /**
   * A control parked at the end of the strip, inside its rule (Compétences puts
   * the search magnifier there). It sits OUTSIDE the measured tab row on
   * purpose — the columns and the ink bar are sized from the tabs' own width, so
   * adding one never shifts the bar off its label.
   */
  right?: React.ReactNode;
}) {
  const theme = useProphecyTheme();
  const { fontScale } = useWindowDimensions();
  const [width, setWidth] = useState(0);
  const sliding = progress != null;
  const tabWidth = labels.length > 0 ? width / labels.length : 0;

  // Two signals, OR-ed: a cheap estimate that is right on the first paint (so
  // the labels don't visibly swap on mount), and the layout itself — a full
  // label that WRAPPED did not fit, whatever the estimate thought.
  const [wrapped, setWrapped] = useState(false);
  // Any change in the available room re-opens the question: a strip that got
  // wider (rotation, split pane, smaller font scale) must go back to full words.
  // Reset during render — React's "adjust state when a prop changes" recipe —
  // so the full labels are already back on the very next paint.
  const roomKey = `${tabWidth}|${fontScale}`;
  const [measuredRoom, setMeasuredRoom] = useState(roomKey);
  if (measuredRoom !== roomKey) {
    setMeasuredRoom(roomKey);
    setWrapped(false);
  }

  const widest = Math.max(
    0,
    ...labels.map((l) => labelText(l, false).length * CHAR_WIDTH * fontScale),
  );
  const compact = wrapped || (tabWidth > 0 && widest > tabWidth - LABEL_PADDING);

  const onTextLayout = (e: NativeSyntheticEvent<TextLayoutEventData>) => {
    if (e.nativeEvent.lines.length > 1) setWrapped(true);
  };

  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  return (
    <View style={[styles.tabs, { borderBottomColor: theme.prophecy.borderSoft }, style]}>
      <View style={styles.tabRow} onLayout={onLayout}>
        {labels.map((label, i) => {
          const isActive = active === i;
          return (
            <Pressable key={labelKey(label)} style={styles.tab} onPress={() => onChange(i)}>
              <Text
                // Once short, never let it wrap: ellipsis beats a two-line strip.
                numberOfLines={compact ? 1 : undefined}
                onTextLayout={compact ? undefined : onTextLayout}
                style={{
                  fontFamily: 'Cinzel_600SemiBold',
                  fontSize: FONT_SIZE,
                  // Label colour follows the SETTLED tab, not the drag: flickering
                  // colours mid-swipe read as a glitch, the moving bar carries the
                  // gesture on its own.
                  color: isActive ? theme.colors.primary : theme.colors.onSurfaceVariant,
                }}>
                {labelText(label, compact)}
              </Text>
              {/* Static mode draws its ink here; the sliding one is one view for
                  the whole row (below), so it can travel between tabs. */}
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

      {right}
    </View>
  );
}

/** Breathing room kept around a label inside its column. */
const LABEL_PADDING = 8;

const styles = StyleSheet.create({
  tabs: { flexDirection: 'row', alignItems: 'flex-end', borderBottomWidth: StyleSheet.hairlineWidth },
  // The measured part: the ink bar's geometry is this row's width / tab count.
  tabRow: { flex: 1, flexDirection: 'row' },
  tab: { flex: 1, alignItems: 'center', paddingTop: 10, gap: 8, paddingHorizontal: 2 },
  tabInk: { height: 2, alignSelf: 'stretch', borderRadius: 2 },
  slidingInk: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    height: 2,
    borderRadius: 2,
    pointerEvents: 'none',
  },
});
