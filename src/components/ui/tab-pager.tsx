// A tab strip whose pages can also be swiped.
//
// Built on a plain paging ScrollView rather than a native pager: no new native
// dependency (so no dev-client rebuild), it works on web, and the scroll offset
// drives the strip's ink bar for free — the bar tracks the thumb instead of
// jumping once the page settles.
//
// Pages are mounted LAZILY and then kept: the Compagnie's roster cards are
// expensive, and mounting the three tabs nobody opened would double the work on
// arrival. Each page owns its own vertical scrolling — the strip stays pinned.
//
// The pager measures itself (not the window) so it behaves inside a split pane.

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import SubTabs, { labelKey, type TabLabel } from '@/components/ui/sub-tabs';
import { USE_NATIVE_DRIVER } from '@/lib/animation';

export default function TabPager({
  labels,
  active,
  onChange,
  renderPage,
  swipeEnabled = true,
  headerStyle,
  headerRight,
}: {
  labels: readonly TabLabel[];
  active: number;
  onChange: (index: number) => void;
  /** Called for a page once it has been visited; keep it cheap for hidden ones. */
  renderPage: (index: number) => React.ReactNode;
  /** Off on a split layout, where a page swipe fights the two-pane reading. */
  swipeEnabled?: boolean;
  /** Screen-level spacing for the strip (margins only). */
  headerStyle?: StyleProp<ViewStyle>;
  /** A control parked at the end of the strip (see <SubTabs> `right`). */
  headerRight?: React.ReactNode;
}) {
  const [width, setWidth] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  // Lazy useState rather than useRef(...).current — no ref read during render.
  const [scrollX] = useState(() => new Animated.Value(0));
  // Pages the user has actually reached — mounted from then on.
  const [visited, setVisited] = useState<number[]>(() => [active]);

  // Adjusted during render rather than in an effect: this is React's documented
  // "derive state from props" update, and it mounts the page in the same commit
  // instead of one frame later.
  if (!visited.includes(active)) setVisited([...visited, active]);

  // A tap on the strip (or any external tab change) scrolls the pager. Also runs
  // on the first layout, which is what puts a non-zero initial tab on screen.
  useEffect(() => {
    if (width > 0) scrollRef.current?.scrollTo({ x: active * width, animated: true });
  }, [active, width]);

  const progress = useMemo(
    () => (width > 0 ? Animated.divide(scrollX, width) : undefined),
    [scrollX, width],
  );

  /** Commit the tab the pager has come to rest on. */
  const settleAt = useCallback(
    (x: number) => {
      if (width <= 0) return;
      const index = Math.round(x / width);
      if (index !== active && index >= 0 && index < labels.length) onChange(index);
    },
    [width, active, labels.length, onChange],
  );

  // Settle from the scroll stream itself, once the offset stops moving.
  //
  // react-native-web emits NEITHER onScrollEndDrag NOR onMomentumScrollEnd — its
  // ScrollView only ever calls onScroll (see ScrollViewBase), and the other two
  // are passed down as non-DOM props that never fire. So a trackpad pan moved the
  // ink bar, which rides the raw offset, while `active` never advanced and the
  // page was therefore never mounted: the tab looked selected and stayed blank.
  //
  // Debouncing the offset covers every input on every platform. On native it just
  // lands right after the momentum snap, so the handlers below still do the
  // committing there and this only backstops them.
  // Watch the offset from an effect rather than from the scroll event: the timer
  // is then an ordinary local, with no ref to read during render and nothing for
  // the memo below to capture, so `onScroll` stays the plain Animated.event it
  // always was. The value fires here on web (JS-driven) and on native alike — an
  // Animated.Value with a JS listener reports back even when natively driven.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const id = scrollX.addListener(({ value }) => {
      if (timer) clearTimeout(timer);
      // Longer than react-native-web's own 100ms scroll-end timeout, so we run
      // after its final synthetic onScroll rather than racing it.
      timer = setTimeout(() => settleAt(value), 150);
    });
    return () => {
      scrollX.removeListener(id);
      if (timer) clearTimeout(timer);
    };
  }, [scrollX, settleAt]);

  const onScroll = useMemo(
    () =>
      Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], {
        useNativeDriver: USE_NATIVE_DRIVER,
      }),
    [scrollX],
  );

  const onSettle = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    settleAt(e.nativeEvent.contentOffset.x);
  };

  /**
   * A slow drag with no fling emits no momentum event, so the release has to
   * settle it. Only when the finger left with (almost) no velocity, though:
   * settling a real fling here would commit a tab the snap is still deciding on,
   * and the scroll-to-active effect would then fight it.
   */
  const onDragEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (Math.abs(e.nativeEvent.velocity?.x ?? 0) < 0.1) onSettle(e);
  };

  return (
    <View style={styles.root}>
      <SubTabs
        labels={labels}
        active={active}
        onChange={onChange}
        style={headerStyle}
        progress={progress}
        right={headerRight}
      />

      <Animated.ScrollView
        ref={scrollRef}
        style={styles.pages}
        horizontal
        pagingEnabled
        scrollEnabled={swipeEnabled}
        showsHorizontalScrollIndicator={false}
        // A swipe with the keyboard up should put it away, not scroll behind it.
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
        // iOS drifts diagonally without this when a page scrolls vertically.
        directionalLockEnabled
        onScroll={onScroll}
        scrollEventThrottle={16}
        onMomentumScrollEnd={onSettle}
        onScrollEndDrag={onDragEnd}>
        {labels.map((label, i) => (
          <View key={labelKey(label)} style={{ width }}>
            {visited.includes(i) ? renderPage(i) : null}
          </View>
        ))}
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  pages: { flex: 1 },
});
