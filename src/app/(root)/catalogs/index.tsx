import { Suspense, lazy, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import type { TabLabel } from '@/components/ui/sub-tabs';
import TabPager from '@/components/ui/tab-pager';

/**
 * Each catalogue is loaded the first time its tab is opened, never before.
 *
 * Not a micro-optimisation: Expo's Metro config sets `inlineRequires: false`, so
 * a plain top-level import evaluates the module the moment THIS screen is
 * required — all four generated data modules, on the tap that opens the tab.
 * They are not small: measured in Node, `spell-catalog.gen` alone costs ~139ms
 * to evaluate (338 spells of rulebook prose) against ~43ms for the weapon,
 * armor and shield catalogues put together.
 *
 * Behind `lazy` the strip paints on the tap and each catalogue is built only if
 * it is actually read — so opening Catalogues to look up a sword never touches
 * the sortilèges at all.
 */
const PAGES = [
  lazy(() => import('@/components/catalog/spell-catalog-list')),
  lazy(() => import('@/components/catalog/weapon-catalog-list')),
  lazy(() => import('@/components/catalog/armor-catalog-list')),
  lazy(() => import('@/components/catalog/shield-catalog-list')),
];

/** Module-level: an inline component type would remount the spinner every render. */
function CatalogLoading() {
  return (
    <View style={styles.loading}>
      <ActivityIndicator />
    </View>
  );
}

const TABS: readonly TabLabel[] = [
  { full: 'Sortilèges', short: 'Sorts' },
  'Armes',
  'Armures',
  'Boucliers',
];

/**
 * The rulebook, read outside any character: the same four catalogues a player
 * picks from on a sheet, with nothing to pick INTO. No `onAdd` and no readings,
 * so the rows lose their `+` and every formula stays symbolic — « FOR × 2 + 1D10 »
 * rather than a number that would belong to a character who is not here.
 *
 * A `TabPager` and not four screens: switching from a sortilège to the arme it
 * is cast alongside is the whole reason to open this, and a stack would make
 * that two taps and a lost scroll position. Pages mount lazily and then stay.
 *
 * No `<TabPage>` wrapper here, unlike the character tabs: each catalogue list
 * already owns its scroll (a `ScrollView`, or a `SectionList` for the
 * sortilèges), and a second scroller around it would fight both.
 */
export default function CatalogsScreen() {
  const [tab, setTab] = useState(0);
  /**
   * Whether the first catalogue may start loading. The pager's strip paints
   * before it does — and `Suspense` alone does NOT achieve that on arrival.
   *
   * Two things in expo-router conspire. Every route is already wrapped in a
   * Suspense boundary of the router's own, whose PRODUCTION fallback renders
   * `null` (`views/SuspenseFallback`, a « Bundling… » toast in dev). And a
   * navigation is a transition, during which a boundary mounted in the same
   * commit as the content that suspends does not get to show its fallback — so
   * the first page suspended past ours into the route's, and the screen showed
   * nothing at all in a release build while showing a toast in dev.
   *
   * Hence both halves below: the boundary is mounted from the very first commit
   * (its child is the spinner until `ready`), and the flip that lets the
   * catalogue load is a plain state update rather than part of the navigation.
   */
  const [ready, setReady] = useState(false);
  useEffect(() => {
    // Once the thread is idle, not during the navigation animation: requiring a
    // catalogue is the single most expensive thing this screen does.
    //
    // `requestIdleCallback` and not InteractionManager, which RN 0.86 deprecates
    // in favour of exactly this. The `timeout` is not optional — idle may never
    // come on a busy thread, and the catalogue would then never load at all. The
    // fallback covers runtimes without it (Safari before 17.4, on the web build).
    const run = () => setReady(true);
    if (typeof requestIdleCallback === 'function') {
      const id = requestIdleCallback(run, { timeout: 500 });
      return () => cancelIdleCallback(id);
    }
    const id = setTimeout(run, 0);
    return () => clearTimeout(id);
  }, []);

  return (
    <View style={styles.root}>
      <TabPager
        labels={TABS}
        active={tab}
        onChange={setTab}
        headerStyle={styles.strip}
        renderPage={(i) => {
          const Page = PAGES[i];
          if (!Page) return null;
          // The boundary is rendered unconditionally and the CHILD is what waits
          // — see `ready` above. Gating the boundary itself would recreate the
          // very problem it is there to solve.
          //
          // Nothing (not even the spinner) goes inside a page before `ready`:
          // the pager sizes its pages from its own `onLayout`, so until it has
          // measured they are zero-wide and anything centred in one lands hard
          // against the left edge. The overlay below covers that first moment.
          return <Suspense fallback={<CatalogLoading />}>{ready ? <Page /> : null}</Suspense>;
        }}
      />

      {/* The very first load, drawn over the (still unmeasured) pager rather
          than inside it. `pointerEvents="none"` so the strip stays tappable —
          switching tab before the first catalogue has landed is legitimate. */}
      {!ready ? (
        <View style={styles.firstLoad} pointerEvents="none">
          <ActivityIndicator />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  strip: { marginHorizontal: 12, marginTop: 8 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  firstLoad: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
