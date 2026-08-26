import React, { createContext, useCallback, useContext, useMemo, useRef } from 'react';
import { Platform, type NativeScrollEvent, type NativeSyntheticEvent, type View } from 'react-native';

/**
 * Puts a collapsing {@link CatalogRow} back at the top of the screen.
 *
 * A rulebook entry is routinely taller than the viewport, so « Replier » is
 * tapped far below the row that opened it: collapsing alone would drop the
 * reader into whatever rows happen to sit at that offset. Scrolling the row to
 * the top instead resumes the list exactly where the reading started.
 *
 * The row cannot do this by itself — it has no idea which scrollable it lives
 * in, and there are two (a `ScrollView` for armes/armures/boucliers, a
 * `SectionList` for the 300+ sortilèges). So the *screen* owns the scroller and
 * publishes one function here; the row measures itself against it.
 *
 * Outside a provider the context is a no-op: the row still collapses, it just
 * does not scroll.
 */
export interface CatalogScroll {
  /** Scroll so `row` sits at the top of the viewport. */
  rowToTop: (row: View | null) => void;
}

const NO_SCROLL: CatalogScroll = { rowToTop: () => {} };

const CatalogScrollContext = createContext<CatalogScroll>(NO_SCROLL);

/** Read by CatalogRow. Safe anywhere — defaults to a no-op. */
export function useCatalogScroll(): CatalogScroll {
  return useContext(CatalogScrollContext);
}

export function CatalogScrollProvider({
  value,
  children,
}: {
  value: CatalogScroll;
  children: React.ReactNode;
}) {
  return <CatalogScrollContext.Provider value={value}>{children}</CatalogScrollContext.Provider>;
}

/**
 * What the hook needs off a scrollable, typed structurally rather than as
 * `ScrollView | SectionList`: the two RN types declare these with incompatible
 * loose signatures, and one hook has to cover both.
 *
 * `getScrollResponder` is the ScrollView that can actually be driven — a
 * SectionList has no `scrollTo` of its own — and doubles as the hop to the
 * ScrollView's own methods. `getNativeScrollRef` is the **host instance**, and
 * it has to be that: `getScrollableNode()` returns a node handle (a number),
 * which the new architecture's `measureLayout` rejects outright with « ref
 * .measureLayout must be called with a ref to a native component ».
 */
interface ScrollResponder {
  scrollTo?: (o: { y: number; animated?: boolean }) => void;
  getNativeScrollRef?: () => object | null;
}

interface ScrollHost extends ScrollResponder {
  getScrollResponder?: () => ScrollResponder | null | undefined;
}

/**
 * Wire a catalogue screen's scrollable up to {@link CatalogScroll}.
 *
 * Put `scrollRef` on the `ScrollView`/`SectionList` and call `onScroll` from
 * its own handler (the sortilèges screen already has one, for its filter FAB),
 * then wrap the rows in a `<CatalogScrollProvider value={value}>`.
 *
 * `scrollRef` is a callback ref rather than an object one so it types against
 * both scrollables at once — they declare no common instance type, and a
 * callback taking `unknown` is assignable to either.
 *
 * The offset is only ever needed on web (see `rowToTop`), and it is kept in a
 * ref rather than state: it is read once per collapse, and storing it would
 * re-render the whole list on every frame of a scroll.
 */
export function useCatalogScrollHost() {
  const host = useRef<ScrollHost | null>(null);
  const offset = useRef(0);

  const scrollRef = useCallback((instance: unknown) => {
    host.current = (instance as ScrollHost | null) ?? null;
  }, []);

  const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    offset.current = e.nativeEvent.contentOffset.y;
  }, []);

  const rowToTop = useCallback((row: View | null) => {
    // A ScrollView answers `getScrollResponder` with itself; a SectionList
    // answers with the ScrollView it wraps. Either way the native ref hangs off
    // the responder, so one lookup covers both.
    const scroller = host.current?.getScrollResponder?.() ?? host.current;
    const native = scroller?.getNativeScrollRef?.();
    if (!row || !native || !scroller?.scrollTo) return;
    // The failure branch is deliberately silent: a row that cannot be measured
    // (unmounted mid-animation, a host that forwards no ref) must still
    // collapse, and there is nothing a user could do about it.
    row.measureLayout(
      native as never,
      (_x, y) => {
        // `measureLayout` does NOT mean the same thing on both platforms, and
        // getting it wrong overshoots by exactly the current scroll offset.
        // Native reads the SHADOW tree, which knows nothing about scrolling, so
        // `y` is already the row's position in the content. Web computes a
        // getBoundingClientRect delta, and react-native-web's own `getRect`
        // subtracts `scrollTop` on the way up — so there `y` is the position in
        // the VISIBLE frame (negative once the row has scrolled off the top)
        // and the offset has to be added back.
        const y0 = Platform.OS === 'web' ? offset.current + y : y;
        scroller.scrollTo?.({ y: y0, animated: true });
      },
      () => {},
    );
  }, []);

  const value = useMemo<CatalogScroll>(() => ({ rowToTop }), [rowToTop]);

  return { scrollRef, onScroll, value };
}
