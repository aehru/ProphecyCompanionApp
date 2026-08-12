import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { Searchbar, Snackbar, Text } from 'react-native-paper';

import ArmorDetail from '@/components/armor-detail';
import CatalogRow from '@/components/catalog-row';
import { prerequisitesUnmet } from '@/components/gear-detail-rows';
import Icon from '@/components/ui/icon';
import SectionCard from '@/components/ui/section-card';
import { ARMOR_CATALOG, ARMOR_CATEGORIES, type ArmorPreset } from '@/data/armor-catalog';
import { useCaracReadings } from '@/hooks/use-carac-readings';
import { useCharacterId } from '@/hooks/use-character-id';
import { contentWidth } from '@/hooks/use-layout';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';
import { log } from '@/lib/log';
import { createArmor } from '@/repositories/armor';

/**
 * Armor catalogue picker (modal). Tap a row to preview it, the `+` to add it —
 * see the weapon catalogue for the reasoning. Grouped by weight category, no
 * handedness sub-grouping (armor has none).
 */
export default function ArmorCatalogModal() {
  const numId = useCharacterId();
  const router = useRouter();
  const theme = useProphecyTheme();
  const [query, setQuery] = useState('');
  const [toast, setToast] = useState<{ text: string; armorId: number } | null>(null);
  const { caracValue } = useCaracReadings(numId);

  const q = query.trim().toLowerCase();
  const filtered = useMemo(
    () =>
      q === ''
        ? ARMOR_CATALOG
        : ARMOR_CATALOG.filter((p) => (p.data.name ?? '').toLowerCase().includes(q)),
    [q],
  );

  const add = async (preset?: ArmorPreset) => {
    // The picked preset's slug — see the spell catalogue for why it is logged
    // from the screen and not passed down to the repository.
    if (preset) log.info('catalog.add', { entity: 'armor', catalogId: preset.id });
    const row = await createArmor(numId, preset?.data);
    // A blank armor has nothing to read here, so it still opens its editor.
    if (!preset) {
      router.replace(`/character/${numId}/armor/${row.id}`);
      return;
    }
    setToast({ text: `« ${preset.data.name} » ajoutée.`, armorId: row.id });
  };

  return (
    <View style={styles.root}>
      <KeyboardAwareScrollView
        contentContainerStyle={[styles.container, contentWidth]}
        bottomOffset={24}>
        <Searchbar
          placeholder="Rechercher une armure"
          value={query}
          onChangeText={setQuery}
          icon={({ size, color }) => <Icon name="search" size={size} color={color} />}
        />

        <Pressable
          onPress={() => add()}
          style={[styles.row, { borderBottomColor: theme.prophecy.borderSoft }]}>
          <View
            style={[
              styles.tile,
              { backgroundColor: theme.colors.surface, borderColor: theme.colors.primary },
            ]}>
            <Icon name="plus" size={22} color={theme.colors.primary} />
          </View>
          <View style={styles.main}>
            <Text style={styles.name}>Armure personnalisée</Text>
            <Text style={[styles.sub, { color: theme.colors.onSurfaceVariant }]}>
              Partir de zéro
            </Text>
          </View>
          <Icon name="chev" size={18} color={theme.colors.onSurfaceVariant} />
        </Pressable>

        {ARMOR_CATEGORIES.map((cat) => {
          const items = filtered.filter((p) => p.category === cat);
          if (items.length === 0) return null;
          return (
            <SectionCard key={cat} title={cat} icon="shield">
              {items.map((p) => (
                <CatalogRow
                  key={p.id}
                  icon="shield"
                  name={p.data.name ?? ''}
                  subtitle={[`Défense ${p.data.defenseMax}`, p.data.prerequisites]
                    .filter((s) => s && String(s).trim() !== '')
                    .join(' · ')}
                  addLabel={`Ajouter ${p.data.name}`}
                  alert={prerequisitesUnmet(p.data.prerequisites, caracValue)}
                  onAdd={() => add(p)}>
                  <ArmorDetail armor={p.data} caracValue={caracValue} />
                </CatalogRow>
              ))}
            </SectionCard>
          );
        })}

        {filtered.length === 0 ? (
          <Text style={[styles.empty, { color: theme.colors.onSurfaceVariant }]}>
            Aucune armure ne correspond.
          </Text>
        ) : null}
      </KeyboardAwareScrollView>

      <Snackbar
        visible={toast !== null}
        onDismiss={() => setToast(null)}
        duration={3000}
        action={{
          label: 'Modifier',
          onPress: () => {
            if (toast) router.replace(`/character/${numId}/armor/${toast.armorId}`);
          },
        }}>
        {toast?.text ?? ''}
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  container: { padding: 16, gap: 16, paddingBottom: 48 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 13, paddingVertical: 10, borderBottomWidth: 1 },
  tile: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  main: { flex: 1, minWidth: 0 },
  name: { fontSize: 14, fontWeight: '600' },
  sub: { fontSize: 12, marginTop: 1 },
  empty: { textAlign: 'center', marginTop: 8 },
});
