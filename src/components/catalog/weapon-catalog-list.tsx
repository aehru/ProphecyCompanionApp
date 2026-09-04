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
import { WEAPON_CATALOG, type WeaponCategory, type WeaponPreset } from '@/data/weapon-catalog';
import type { CaracReadings } from '@/hooks/use-carac-readings';
import { contentWidth } from '@/hooks/use-layout';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';
import { foldQuery } from '@/lib/text-fold';
import { buildWeaponIndex, groupWeapons } from '@/lib/weapon-grouping';

// Ranged families get a compass glyph; everything else is melee (sword).
const RANGED_CATEGORIES: WeaponCategory[] = [
  'Armes de jet',
  'Armes à projectile',
  'Armes mécaniques',
];
const iconFor = (cat: WeaponCategory): IconName =>
  RANGED_CATEGORIES.includes(cat) ? 'compass' : 'sword';

// Folded once at module load: the catalogue is static, and re-deriving it per
// keystroke is the cost lib/weapon-grouping exists to remove.
const INDEX = buildWeaponIndex(WEAPON_CATALOG);

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
  const { groups, total } = useMemo(() => groupWeapons(INDEX, applied), [applied]);

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

        {groups.map((group) => {
          // The glyph is a UI fact, resolved here rather than in the grouping —
          // lib/weapon-grouping stays free of anything the screen decides.
          const icon = iconFor(group.category);
          return (
            <SectionCard key={group.category} title={group.category} icon={icon}>
              {group.hands.map(({ hand, items }) => (
                <View key={hand} style={styles.handGroup}>
                  <Text style={[styles.handLabel, { color: theme.colors.onSurfaceVariant }]}>
                    {hand}
                  </Text>
                  {items.map((p) => (
                    <WeaponRow key={p.id} preset={p} icon={icon} readings={readings} onAdd={onAdd} />
                  ))}
                </View>
              ))}
            </SectionCard>
          );
        })}

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
