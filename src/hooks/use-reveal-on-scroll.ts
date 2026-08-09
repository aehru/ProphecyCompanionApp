// A bar that floats over a scroll view and tucks away as you scroll DOWN,
// sliding back on the first scroll up (the Chrome-toolbar pattern): the list
// gets the full viewport while reading, and the controls come back without a
// trip to the top.
//
// Returns what the screen has to wire: the measured height (use it as the
// list's top padding, since the bar is absolutely positioned), the layout and
// scroll handlers, and the animated translateY.

import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, type LayoutChangeEvent, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';

/** How far the finger must travel before a direction counts (px). */
const DIRECTION_THRESHOLD = 6;
/** Near the top the bar is always out. */
const TOP_ZONE = 8;

export function useRevealOnScroll({
  height,
  pinned = false,
}: {
  /** Pre-layout estimate, refined by onLayout on first paint. */
  height: number;
  /** Keep the bar out no matter the scrolling (e.g. it holds a focused input). */
  pinned?: boolean;
}) {
  const [barHeight, setBarHeight] = useState(height);
  const heightRef = useRef(height);
  const shown = useRef(true);
  // Lazy useState rather than useRef(...).current: same "create once, keep
  // forever" semantics, without reading a ref during render.
  const [translateY] = useState(() => new Animated.Value(0));
  const lastY = useRef(0);

  const setVisible = useCallback(
    (show: boolean) => {
      if (shown.current === show) return;
      shown.current = show;
      Animated.timing(translateY, {
        toValue: show ? 0 : -heightRef.current,
        duration: 180,
        useNativeDriver: true,
      }).start();
    },
    [translateY],
  );

  const onLayout = useCallback(
    (e: LayoutChangeEvent) => {
      const h = e.nativeEvent.layout.height;
      heightRef.current = h;
      setBarHeight(h);
      // Height changed while hidden (a button appeared/left): re-tuck fully.
      if (!shown.current) translateY.setValue(-h);
    },
    [translateY],
  );

  const onScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const y = e.nativeEvent.contentOffset.y;
      const dy = y - lastY.current;
      lastY.current = y;
      if (pinned || y <= TOP_ZONE) setVisible(true);
      else if (dy > DIRECTION_THRESHOLD) setVisible(false);
      else if (dy < -DIRECTION_THRESHOLD) setVisible(true);
    },
    [pinned, setVisible],
  );

  // Pinning can start while the bar is mid-hide (e.g. typing on a hardware
  // keyboard): bring it back as soon as that happens.
  useEffect(() => {
    if (pinned) setVisible(true);
  }, [pinned, setVisible]);

  return { barHeight, onLayout, onScroll, translateY };
}
