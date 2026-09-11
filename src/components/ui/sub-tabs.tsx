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
// LABELS THAT DON'T FIT: three stages, in order, and the strip takes the first
// one that holds. (1) Equal columns, full words. (2) Equal columns, the shorter
// forms a tab may carry ({ full, short }) — all of them at once, a
// half-abbreviated row reads as a bug. (3) The columns are given up: the strip
// SCROLLS, each tab sized by its own words, the active one recentred once the
// pager settles. That third stage is what lets a catalogue grow past the six
// tabs a phone fits without the words shrinking away to nothing.
//
// "Fit" is measured against THIS strip (the Compagnie's lives in a split pane,
// not the window) and against the user's font scale, so 130% text triggers the
// same fallbacks as a narrow screen.
//
// The strip is the pager's HEADER, outside its pages — which is why scrolling
// it horizontally is allowed at all: it never sits inside the pager's own
// horizontal scroll, unlike anything a page holds.

import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  type LayoutChangeEvent,
  Pressable,
  ScrollView,
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

/** Where a tab landed inside the scrolling strip. */
type TabBox = { x: number; width: number };

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
   * adding one never shifts the bar off its label, and a scrolling strip never
   * carries it out of reach.
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
  // Where each tab landed, filled by the tabs' own onLayout. Only the scrolling
  // strip needs it: a column's geometry is width / count and needs no measuring.
  const [boxes, setBoxes] = useState<readonly (TabBox | undefined)[]>([]);
  // Any change in the available room re-opens the question: a strip that got
  // wider (rotation, split pane, smaller font scale) must go back to full words.
  // Reset during render — React's "adjust state when a prop changes" recipe —
  // so the full labels are already back on the very next paint.
  const roomKey = `${tabWidth}|${fontScale}|${labels.length}`;
  const [measuredRoom, setMeasuredRoom] = useState(roomKey);
  if (measuredRoom !== roomKey) {
    setMeasuredRoom(roomKey);
    setWrapped(false);
    setBoxes([]);
  }

  const widest = (short: boolean) =>
    Math.max(0, ...labels.map((l) => labelText(l, short).length * CHAR_WIDTH * fontScale));

  const room = tabWidth - LABEL_PADDING;
  const compact = wrapped || (tabWidth > 0 && widest(false) > room);
  // Stage three: even the short forms would not hold a column, so the columns go
  // and the strip scrolls instead. Read off the SHORT estimate alone — `wrapped`
  // only ever reports on the full words, and abbreviating is the cheaper fix.
  const scrolls = tabWidth > 0 && widest(true) > room;

  const onTextLayout = (e: NativeSyntheticEvent<TextLayoutEventData>) => {
    if (e.nativeEvent.lines.length > 1) setWrapped(true);
  };

  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  const onTabLayout = (index: number) => (e: LayoutChangeEvent) => {
    const { x, width: w } = e.nativeEvent.layout;
    setBoxes((prev) => {
      const at = prev[index];
      if (at && at.x === x && at.width === w) return prev;
      // Rebuilt DENSE, never `slice()` + assign: a strip whose last tab is laid
      // out first would leave holes, and `every` below skips holes — the array
      // would pass for measured while most of it is still undefined.
      return Array.from({ length: labels.length }, (_, k) =>
        k === index ? { x, width: w } : prev[k],
      );
    });
  };

  // A tab is only worth placing once EVERY tab has been measured — the ink bar
  // reads the same array, and a half-filled one places both wrong.
  const measured: TabBox[] | null =
    boxes.length === labels.length && boxes.every((b) => b != null) ? (boxes as TabBox[]) : null;

  const scrollRef = useRef<ScrollView>(null);

  // Where the active tab wants the strip scrolled to, or null while there is
  // nothing to scroll. A NUMBER rather than the box it came from: the boxes
  // array is rebuilt on every layout pass, so depending on it would re-scroll
  // once per tab measured, and on each render that merely re-derived it.
  const activeBox = scrolls && measured && width > 0 ? measured[active] : undefined;
  const target = activeBox ? Math.max(0, activeBox.x + activeBox.width / 2 - width / 2) : null;

  // Bring the settled tab back into view. Centring rather than the smallest
  // nudge that would reveal it: it needs no running scroll offset to be tracked,
  // and it leaves the neighbours showing on both sides, which is what tells the
  // reader there is more strip either way.
  //
  // On settle only, never on the live `progress`: a strip sliding under the
  // finger while the pages slide too is two things moving at different speeds.
  useEffect(() => {
    if (target == null) return;
    scrollRef.current?.scrollTo({ x: target, animated: true });
  }, [target]);

  const tabs = labels.map((label, i) => {
    const isActive = active === i;
    return (
      <Pressable
        key={labelKey(label)}
        style={scrolls ? styles.scrollingTab : styles.tab}
        onLayout={scrolls ? onTabLayout(i) : undefined}
        onPress={() => onChange(i)}>
        <Text
          // Once short, never let it wrap: ellipsis beats a two-line strip. A
          // scrolling tab is sized by its own word and cannot wrap at all.
          numberOfLines={compact || scrolls ? 1 : undefined}
          onTextLayout={compact || scrolls ? undefined : onTextLayout}
          style={{
            fontFamily: 'Cinzel_600SemiBold',
            fontSize: FONT_SIZE,
            // Label colour follows the SETTLED tab, not the drag: flickering
            // colours mid-swipe read as a glitch, the moving bar carries the
            // gesture on its own.
            color: isActive ? theme.colors.primary : theme.colors.onSurfaceVariant,
          }}>
          {labelText(label, compact || scrolls)}
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
  });

  // The sliding bar, in whichever geometry the strip ended up using.
  //
  // Columns: one width, one straight translation — what it has always been.
  //
  // Scrolling: the tabs have different widths, so the bar travels between their
  // CENTRES and is scaled to each one. Scaled, not resized: `width` is not a
  // transform and animating it would drop the strip off the native driver,
  // while scaleX around the centre is exactly what a centre-anchored
  // translation wants. The bar sits inside the scrolled content, so it rides
  // along with it for free.
  let ink: React.ReactNode = null;
  const base = measured ? Math.max(...measured.map((b) => b.width)) : 0;
  // `base > 0` is the division guard: a tab measured before its font has loaded
  // can come back zero-wide, and a zero base turns every scaleX stop into NaN —
  // which does not throw, it just makes the bar vanish for good.
  if (sliding && scrolls && measured && labels.length > 1 && base > 0) {
    const stops = labels.map((_, i) => i);
    ink = (
      <Animated.View
        style={[
          styles.slidingInk,
          {
            width: base,
            backgroundColor: theme.colors.primary,
            transform: [
              {
                translateX: progress.interpolate({
                  inputRange: stops,
                  outputRange: measured.map((b) => b.x + b.width / 2 - base / 2),
                  extrapolate: 'clamp',
                }),
              },
              {
                scaleX: progress.interpolate({
                  inputRange: stops,
                  outputRange: measured.map((b) => b.width / base),
                  extrapolate: 'clamp',
                }),
              },
            ],
          },
        ]}
      />
    );
  } else if (sliding && !scrolls && tabWidth > 0) {
    ink = (
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
    );
  }

  return (
    <View style={[styles.tabs, { borderBottomColor: theme.prophecy.borderSoft }, style]}>
      {scrolls ? (
        <ScrollView
          ref={scrollRef}
          style={styles.tabRow}
          onLayout={onLayout}
          horizontal
          showsHorizontalScrollIndicator={false}
          // A tap on a tab must go through while the strip is itself scrollable.
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scrollingRow}>
          {tabs}
          {ink}
        </ScrollView>
      ) : (
        <View style={styles.tabRow} onLayout={onLayout}>
          {tabs}
          {ink}
        </View>
      )}

      {right}
    </View>
  );
}

/** Breathing room kept around a label inside its column. */
const LABEL_PADDING = 8;

const styles = StyleSheet.create({
  tabs: { flexDirection: 'row', alignItems: 'flex-end', borderBottomWidth: StyleSheet.hairlineWidth },
  // The measured part. In column mode the ink bar's geometry is this row's
  // width / tab count; in scroll mode this is the VIEWPORT the active tab gets
  // centred in.
  tabRow: { flex: 1, flexDirection: 'row' },
  tab: { flex: 1, alignItems: 'center', paddingTop: 10, gap: 8, paddingHorizontal: 2 },
  // Sized by its own words instead of by an equal share. The wider padding is
  // what keeps two short labels from reading as one.
  scrollingTab: { alignItems: 'center', paddingTop: 10, gap: 8, paddingHorizontal: 14 },
  // Tabs sit on the rule like the columns do; they start at the left and run
  // off the right, which is how a scrollable strip says there is more of it.
  scrollingRow: { alignItems: 'flex-end' },
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
