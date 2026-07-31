import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { Searchbar, Text } from 'react-native-paper';

import Icon from '@/components/ui/icon';
import SectionCard from '@/components/ui/section-card';
import { ARMOR_CATALOG, ARMOR_CATEGORIES, type ArmorPreset } from '@/data/armor-catalog';
import { useCharacterId } from '@/hooks/use-character-id';
import { contentWidth } from '@/hooks/use-layout';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';
import { createArmor } from '@/repositories/armor';

/**
 * Armor catalogue picker (modal). Select a preset to add it to the character
 * and jump straight into its editor, or start from a blank custom armor.
 * Mirrors the weapon catalogue; grouped by weight category, no handedness
 * sub-grouping (armor has none).
 */
export default function ArmorCatalogModal() {
  const numId = useCharacterId();
  const router = useRouter();
  const theme = useProphecyTheme();
  const [query, setQuery] = useState('');

  const q = query.trim().toLowerCase();
  const filtered = useMemo(
    () =>
      q === ''
        ? ARMOR_CATALOG
        : ARMOR_CATALOG.filter((p) => (p.data.name ?? '').toLowerCase().includes(q)),
    [q],
  );

  // Add the armor, then replace this screen with its editor so "back" from the
  // editor returns to the Inventaire tab (not the catalogue).
  const add = async (preset?: ArmorPreset) => {
    const row = await createArmor(numId, preset?.data);
    router.replace(`/character/${numId}/armor/${row.id}`);
  };

  return (
    <KeyboardAwareScrollView contentContainerStyle={[styles.container, contentWidth]} bottomOffset={24}>
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
          <Text style={[styles.sub, { color: theme.colors.onSurfaceVariant }]}>Partir de zéro</Text>
        </View>
        <Icon name="chev" size={18} color={theme.colors.onSurfaceVariant} />
      </Pressable>

      {ARMOR_CATEGORIES.map((cat) => {
        const items = filtered.filter((p) => p.category === cat);
        if (items.length === 0) return null;
        return (
          <SectionCard key={cat} title={cat} icon="shield">
            {items.map((p) => (
              <Pressable
                key={p.id}
                onPress={() => add(p)}
                style={[styles.row, { borderBottomColor: theme.prophecy.borderSoft }]}>
                <View
                  style={[
                    styles.tile,
                    { backgroundColor: theme.colors.surface, borderColor: theme.prophecy.borderSoft },
                  ]}>
                  <Icon name="shield" size={22} color={theme.colors.primary} />
                </View>
                <View style={styles.main}>
                  <Text style={styles.name} numberOfLines={1}>
                    {p.data.name}
                  </Text>
                  <Text
                    style={[styles.sub, { color: theme.colors.onSurfaceVariant }]}
                    numberOfLines={1}>
                    {[`Défense ${p.data.defenseMax}`, p.data.prerequisites]
                      .filter((s) => s && String(s).trim() !== '')
                      .join(' · ')}
                  </Text>
                </View>
                <Icon name="chev" size={18} color={theme.colors.onSurfaceVariant} />
              </Pressable>
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
  );
}

const styles = StyleSheet.create({
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
