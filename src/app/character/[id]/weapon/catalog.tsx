import React, { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { Searchbar, Text } from 'react-native-paper';

import CatalogCustomRow from '@/components/catalog-custom-row';
import CatalogRow from '@/components/catalog-row';
import CatalogSnackbar, { useCatalogSnackbar } from '@/components/catalog-snackbar';
import { prerequisitesUnmet } from '@/components/gear-detail-rows';
import Icon, { type IconName } from '@/components/ui/icon';
import SectionCard from '@/components/ui/section-card';
import WeaponDetail from '@/components/weapon-detail';
import {
  HAND_VALUE,
  WEAPON_CATALOG,
  WEAPON_CATEGORIES,
  WEAPON_HANDS,
  type WeaponCategory,
  type WeaponPreset,
} from '@/data/weapon-catalog';
import { useCaracReadings } from '@/hooks/use-carac-readings';
import { useCharacterId } from '@/hooks/use-character-id';
import { contentWidth } from '@/hooks/use-layout';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';
import { log } from '@/lib/log';
import { fold, foldQuery } from '@/lib/text-fold';
import { createWeapon } from '@/repositories/weapons';

// Ranged families get a compass glyph; everything else is melee (sword).
const RANGED_CATEGORIES: WeaponCategory[] = [
  'Armes de jet',
  'Armes à projectile',
  'Armes mécaniques',
];
const iconFor = (cat: WeaponCategory): IconName =>
  RANGED_CATEGORIES.includes(cat) ? 'compass' : 'sword';

/**
 * Weapon catalogue picker (modal). Tap a row to preview it — the same detail
 * the Fiche shows, resolved against this character — or the `+` to add it.
 * Adding keeps the catalogue open (a player usually equips a party, not one
 * sword); the toast links to the new weapon's editor. Preset data lives in
 * {@link WEAPON_CATALOG}.
 */
export default function WeaponCatalogModal() {
  const numId = useCharacterId();
  const theme = useProphecyTheme();
  const [query, setQuery] = useState('');
  const added = useCatalogSnackbar(numId, 'weapon');
  // Same readings the Inventaire tab feeds its cards — a player picking a weapon
  // wants to know what it does in THEIR hands before adding it.
  const { caracValue, caracModifier, skillReading } = useCaracReadings(numId);

  const q = foldQuery(query);
  const filtered = useMemo(
    () =>
      q === '' ? WEAPON_CATALOG : WEAPON_CATALOG.filter((p) => fold(p.data.name ?? '').includes(q)),
    [q],
  );

  const add = async (preset?: WeaponPreset) => {
    // Persist the preset's handedness (label → schema int) onto the new weapon.
    const data = preset ? { ...preset.data, hands: HAND_VALUE[preset.hands] } : undefined;
    // The picked preset's slug — see the spell catalogue for why it is logged
    // from the screen and not passed down to the repository.
    if (preset) log.info('catalog.add', { entity: 'weapons', catalogId: preset.id });
    const row = await createWeapon(numId, data);
    // A blank weapon has nothing to read in the catalogue, so it still opens its
    // editor; a preset stays here so the player can pick the next one.
    if (!preset) {
      added.openEditor(row.id);
      return;
    }
    added.announce(`« ${preset.data.name} » ajoutée.`, row.id);
  };

  return (
    <View style={styles.root}>
      <KeyboardAwareScrollView
        contentContainerStyle={[styles.container, contentWidth]}
        bottomOffset={24}>
        <Searchbar
          placeholder="Rechercher une arme"
          value={query}
          onChangeText={setQuery}
          icon={({ size, color }) => <Icon name="search" size={size} color={color} />}
        />

        <CatalogCustomRow label="Arme personnalisée" onPress={() => add()} />

        {WEAPON_CATEGORIES.map((cat) => {
          const items = filtered.filter((p) => p.category === cat);
          if (items.length === 0) return null;
          return (
            <SectionCard key={cat} title={cat} icon={iconFor(cat)}>
              {WEAPON_HANDS.map((hand) => {
                const handItems = items.filter((p) => p.hands === hand);
                if (handItems.length === 0) return null;
                return (
                  <View key={hand} style={styles.handGroup}>
                    <Text style={[styles.handLabel, { color: theme.colors.onSurfaceVariant }]}>
                      {hand}
                    </Text>
                    {handItems.map((p) => (
                      <CatalogRow
                        key={p.id}
                        icon={iconFor(cat)}
                        name={p.data.name ?? ''}
                        subtitle={[p.data.damage, p.data.prerequisites]
                          .filter((s) => s && s.trim() !== '')
                          .join(' · ')}
                        addLabel={`Ajouter ${p.data.name}`}
                        alert={prerequisitesUnmet(p.data.prerequisites, caracValue)}
                        onAdd={() => add(p)}>
                        <WeaponDetail
                          weapon={p.data}
                          caracValue={caracValue}
                          caracModifier={caracModifier}
                          skill={skillReading(p.data.skillName)}
                        />
                      </CatalogRow>
                    ))}
                  </View>
                );
              })}
            </SectionCard>
          );
        })}

        {filtered.length === 0 ? (
          <Text style={[styles.empty, { color: theme.colors.onSurfaceVariant }]}>
            Aucune arme ne correspond.
          </Text>
        ) : null}
      </KeyboardAwareScrollView>

      <CatalogSnackbar state={added} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
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
