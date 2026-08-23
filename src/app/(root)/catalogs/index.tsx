import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import ArmorCatalogList from '@/components/catalog/armor-catalog-list';
import ShieldCatalogList from '@/components/catalog/shield-catalog-list';
import SpellCatalogList from '@/components/catalog/spell-catalog-list';
import WeaponCatalogList from '@/components/catalog/weapon-catalog-list';
import TabPager from '@/components/ui/tab-pager';
import type { TabLabel } from '@/components/ui/sub-tabs';

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
 * that two taps and a lost scroll position. Pages mount lazily and then stay,
 * so the 300-spell list is only built if it is actually opened.
 *
 * No `<TabPage>` wrapper here, unlike the character tabs: each catalogue list
 * already owns its scroll (a `ScrollView`, or a `SectionList` for the
 * sortilèges), and a second scroller around it would fight both.
 */
export default function CatalogsScreen() {
  const [tab, setTab] = useState(0);

  return (
    <View style={styles.root}>
      <TabPager
        labels={TABS}
        active={tab}
        onChange={setTab}
        headerStyle={styles.strip}
        renderPage={(i) =>
          i === 0 ? (
            <SpellCatalogList />
          ) : i === 1 ? (
            <WeaponCatalogList />
          ) : i === 2 ? (
            <ArmorCatalogList />
          ) : (
            <ShieldCatalogList />
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  strip: { marginHorizontal: 12, marginTop: 8 },
});
