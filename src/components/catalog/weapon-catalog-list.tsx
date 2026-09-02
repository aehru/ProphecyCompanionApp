import React, { useDeferredValue, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { Searchbar, Text } from 'react-native-paper';

import CatalogCustomRow from '@/components/catalog-custom-row';
import CatalogRow from '@/components/catalog-row';
import { CatalogScrollProvider, useCatalogScrollHost } from '@/components/catalog-scroll';
import { prerequisitesUnmet } from '@/components/gear-detail-rows';
import Icon, { type IconName } from '@/components/ui/icon';
import SectionCard from '@/components/ui/section-card';
import WeaponDetail from '@/components/weapon-detail';
import {
  WEAPON_CATALOG,
  WEAPON_CATEGORIES,
  WEAPON_HANDS,
  type WeaponCategory,
  type WeaponPreset,
} from '@/data/weapon-catalog';
import type { CaracReadings } from '@/hooks/use-carac-readings';
import { contentWidth } from '@/hooks/use-layout';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';
import { fold, foldQuery } from '@/lib/text-fold';

// Ranged families get a compass glyph; everything else is melee (sword).
const RANGED_CATEGORIES: WeaponCategory[] = [
  'Armes de jet',
  'Armes à projectile',
  'Armes mécaniques',
];
const iconFor = (cat: WeaponCategory): IconName =>
  RANGED_CATEGORIES.includes(cat) ? 'compass' : 'sword';

/**
 * Search index, built once at module load — folding 77 names on every keystroke
 * is pure garbage. Same reasoning (and same shape) as the spell catalogue's
 * INDEX; this list is short enough not to need its virtualization, but not
 * short enough to re-derive from scratch per render.
 */
const INDEX = WEAPON_CATALOG.map((preset) => ({ preset, search: fold(preset.data.name ?? '') }));

interface HandGroup {
  hand: (typeof WEAPON_HANDS)[number];
  items: WeaponPreset[];
}
interface CategoryGroup {
  category: WeaponCategory;
  icon: IconName;
  hands: HandGroup[];
}

/**
 * Group the matching presets by category then handedness in ONE pass.
 *
 * The nested `map`+`filter` this replaces walked the whole catalogue
 * `categories × hands` times (20 passes) on every render — including every
 * keystroke, since the search box re-renders the list.
 */
function groupWeapons(query: string): { groups: CategoryGroup[]; total: number } {
  const buckets = new Map<WeaponCategory, Map<string, WeaponPreset[]>>();
  let total = 0;
  for (const entry of INDEX) {
    if (query !== '' && !entry.search.includes(query)) continue;
    total++;
    let byHand = buckets.get(entry.preset.category);
    if (!byHand) buckets.set(entry.preset.category, (byHand = new Map()));
    const list = byHand.get(entry.preset.hands);
    if (list) list.push(entry.preset);
    else byHand.set(entry.preset.hands, [entry.preset]);
  }
  // Emitted in the catalogue's declared order, not in insertion order: the
  // category and handedness sequences are a property of the taxonomy.
  const groups: CategoryGroup[] = [];
  for (const category of WEAPON_CATEGORIES) {
    const byHand = buckets.get(category);
    if (!byHand) continue;
    const hands = WEAPON_HANDS.flatMap((hand) => {
      const items = byHand.get(hand);
      return items ? [{ hand, items }] : [];
    });
    if (hands.length > 0) groups.push({ category, icon: iconFor(category), hands });
  }
  return { groups, total };
}

/**
 * The weapon catalogue itself — search, grouping and rows, with no idea whose
 * it is. Grouped by category then by handedness. Preset data lives in
 * {@link WEAPON_CATALOG}.
 *
 * **Both props are optional, and that is the whole point:** the same list is a
 * *picker* inside a character (readings resolve every formula against their
 * sheet, `+` adds) and a *reference* reached from the home page, where there is
 * no character at all — formulas then stay symbolic and nothing can be added.
 * Neither mode is a stripped copy of the other; the difference is what the
 * caller can answer.
 */
export default function WeaponCatalogList({
  readings,
  onAdd,
}: {
  /** Resolves formulas, prérequis and the compétence against a sheet. */
  readings?: CaracReadings;
  /** Called with a preset, or with nothing for « Arme personnalisée ». */
  onAdd?: (preset?: WeaponPreset) => void;
}) {
  const theme = useProphecyTheme();
  const [query, setQuery] = useState('');
  // Lets a row's « Replier » put itself back at the top of the screen.
  const { scrollRef, onScroll, value: catalogScroll } = useCatalogScrollHost();

  // Re-grouping the catalogue is the expensive half of a keystroke; deferring it
  // keeps the Searchbar responsive while the list catches up — same treatment
  // the spell catalogue gives its own filtering.
  const applied = useDeferredValue(foldQuery(query));
  const { groups, total } = useMemo(() => groupWeapons(applied), [applied]);

  return (
    <CatalogScrollProvider value={catalogScroll}>
      <KeyboardAwareScrollView
        ref={scrollRef}
        onScroll={onScroll}
        contentContainerStyle={[styles.container, contentWidth]}
        bottomOffset={24}>
        <Searchbar
          placeholder="Rechercher une arme"
          value={query}
          onChangeText={setQuery}
          icon={({ size, color }) => <Icon name="search" size={size} color={color} />}
        />

        {onAdd ? <CatalogCustomRow label="Arme personnalisée" onPress={() => onAdd()} /> : null}

        {groups.map((group) => (
          <SectionCard key={group.category} title={group.category} icon={group.icon}>
            {group.hands.map(({ hand, items }) => (
              <View key={hand} style={styles.handGroup}>
                <Text style={[styles.handLabel, { color: theme.colors.onSurfaceVariant }]}>
                  {hand}
                </Text>
                {items.map((p) => (
                  <WeaponRow key={p.id} preset={p} icon={group.icon} readings={readings} onAdd={onAdd} />
                ))}
              </View>
            ))}
          </SectionCard>
        ))}

        {total === 0 ? (
          <Text style={[styles.empty, { color: theme.colors.onSurfaceVariant }]}>
            Aucune arme ne correspond.
          </Text>
        ) : null}
      </KeyboardAwareScrollView>
    </CatalogScrollProvider>
  );
}

/**
 * One catalogue row. Memoized because its props are not free: `skillReading`
 * scans the character's compétences and folds the wound + effect modifiers, and
 * `prerequisitesUnmet` parses a formula — both once per row. Without the memo
 * every keystroke in the search box paid that for all 77 weapons, whether or
 * not the row's detail was even open.
 *
 * The memo only holds while `readings` keeps its identity, which is why
 * `useCaracReadings` returns a memoized object.
 */
const WeaponRow = React.memo(function WeaponRow({
  preset: p,
  icon,
  readings,
  onAdd,
}: {
  preset: WeaponPreset;
  icon: IconName;
  /** Absent when the catalogue is browsed with no character in context. */
  readings?: CaracReadings;
  onAdd?: (preset: WeaponPreset) => void;
}) {
  return (
    <CatalogRow
      icon={icon}
      name={p.data.name ?? ''}
      subtitle={[p.data.damage, p.data.prerequisites].filter((s) => s && s.trim() !== '').join(' · ')}
      addLabel={`Ajouter ${p.data.name}`}
      alert={prerequisitesUnmet(p.data.prerequisites, readings?.caracValue)}
      onAdd={onAdd && (() => onAdd(p))}>
      <WeaponDetail
        weapon={p.data}
        caracValue={readings?.caracValue}
        caracModifier={readings?.caracModifier}
        skill={readings?.skillReading(p.data.skillName)}
      />
    </CatalogRow>
  );
});

const styles = StyleSheet.create({
  container: { padding: 16, gap: 16, paddingBottom: 48 },
  handGroup: { gap: 0 },
  handLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 6,
    marginBottom: 2,
  },
  empty: { textAlign: 'center', marginTop: 8 },
});
