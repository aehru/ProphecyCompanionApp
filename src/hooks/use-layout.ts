import { StyleSheet, useWindowDimensions } from 'react-native';

/**
 * Responsive layout decisions, in one place.
 *
 * Screens must branch on the *intent* returned here (`columns`, `nav`,
 * `denseVertical`) and never on a raw width — that way adding or moving a
 * breakpoint stays a one-file change.
 *
 * Width stops follow the MD3 window size classes (the app is MD3/Paper):
 * compact < 600 (phone portrait), medium 600–839 (small tablet portrait,
 * foldable inner, half of a split screen), expanded >= 840 (tablet landscape,
 * web). MD3's `large`/`extra-large` stops are deliberately not modelled: past
 * 840 nothing changes except how much empty space there is, and `contentWidth`
 * already caps that.
 *
 * `denseVertical` exists because width alone lies: a phone in landscape is
 * ~800x390, i.e. "medium" by width but with no vertical room at all.
 */
const MEDIUM = 600;
const EXPANDED = 840;
const SHORT_HEIGHT = 500;

/** Reading width for a single text/form column. Past this, lines get unreadable. */
export const CONTENT_MAX_WIDTH = 720;
/** Cap for a screen showing two columns of sections side by side. */
export const SPLIT_MAX_WIDTH = 1160;
/** MD3 dialog max width. Paper's Dialog has none — it stretches edge to edge. */
export const DIALOG_MAX_WIDTH = 560;

export type NavMode = 'bar' | 'rail';

export function useLayout() {
  const { width, height } = useWindowDimensions();
  return {
    /** Enough room to stop treating the screen as a phone (>= 600). */
    wide: width >= MEDIUM,
    /** Column count for card grids (`numColumns`, masonry splits). */
    columns: width >= EXPANDED ? 2 : 1,
    /** Tabs chrome: bottom bar on phones, left rail on big screens. */
    nav: (width >= EXPANDED ? 'rail' : 'bar') as NavMode,
    /** No vertical room (phone landscape) — collapse heroes, shrink paddings. */
    denseVertical: height < SHORT_HEIGHT,
  };
}

const widths = StyleSheet.create({
  reading: { width: '100%', maxWidth: CONTENT_MAX_WIDTH, alignSelf: 'center' },
  split: { width: '100%', maxWidth: SPLIT_MAX_WIDTH, alignSelf: 'center' },
  dialog: { width: '100%', maxWidth: DIALOG_MAX_WIDTH, alignSelf: 'center' },
});

/**
 * Caps and centers a scroll view's content instead of stretching it edge to
 * edge on a tablet. Spread into `contentContainerStyle`; it is a no-op below
 * {@link CONTENT_MAX_WIDTH}, so it is safe to apply unconditionally.
 */
export const contentWidth = widths.reading;

/**
 * Same, for a screen that lays its sections out with `<Columns>`: two columns
 * need more room than one, so the cap widens only once the split kicks in.
 */
export function useSplitWidth() {
  return useLayout().columns > 1 ? widths.split : widths.reading;
}

/** Appended to a dialog's `style` array so it stops stretching on a tablet. */
export const dialogWidth = widths.dialog;
