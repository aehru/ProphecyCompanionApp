import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { Searchbar, Text } from 'react-native-paper';

import Icon from '@/components/ui/icon';
import SectionCard from '@/components/ui/section-card';
import { DISCIPLINES, SPHERE_LABEL } from '@/constants/prophecy';
import { SPELL_CATALOG, type SpellPreset } from '@/data/spell-catalog';
import { useCharacterId } from '@/hooks/use-character-id';
import { contentWidth } from '@/hooks/use-layout';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';
import { createSpell } from '@/repositories/spells';

/**
 * Spell catalogue picker (modal). Select a preset to add it and jump into its
 * editor, or start from a blank custom spell. Presets live in {@link SPELL_CATALOG}.
 * Mirrors the weapon catalogue; grouped by discipline.
 */
export default function SpellCatalogModal() {
  const numId = useCharacterId();
  const router = useRouter();
  const theme = useProphecyTheme();
  const [query, setQuery] = useState('');

  const q = query.trim().toLowerCase();
  const filtered = useMemo(
    () =>
      q === ''
        ? SPELL_CATALOG
        : SPELL_CATALOG.filter((p) => (p.data.name ?? '').toLowerCase().includes(q)),
    [q],
  );

  // Add the spell, then replace this screen with its editor so "back" from the
  // editor returns to the Magie tab (not the catalogue).
  const add = async (preset?: SpellPreset) => {
    const row = await createSpell(numId, preset?.data);
    router.replace(`/character/${numId}/spell/${row.id}`);
  };

  return (
    <KeyboardAwareScrollView contentContainerStyle={[styles.container, contentWidth]} bottomOffset={24}>
      <Searchbar
        placeholder="Rechercher un sortilège"
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
          <Text style={styles.name}>Sortilège personnalisé</Text>
          <Text style={[styles.sub, { color: theme.colors.onSurfaceVariant }]}>Partir de zéro</Text>
        </View>
        <Icon name="chev" size={18} color={theme.colors.onSurfaceVariant} />
      </Pressable>

      {DISCIPLINES.map((d) => {
        const items = filtered.filter((p) => p.data.discipline === d.key);
        if (items.length === 0) return null;
        return (
          <SectionCard key={d.key} title={d.label} icon="magic">
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
                  <Icon name="magic" size={22} color={theme.colors.primary} />
                </View>
                <View style={styles.main}>
                  <Text style={styles.name} numberOfLines={1}>
                    {p.data.name}
                  </Text>
                  <Text
                    style={[styles.sub, { color: theme.colors.onSurfaceVariant }]}
                    numberOfLines={1}>
                    {[
                      p.data.level ? `Niv. ${p.data.level}` : null,
                      p.data.sphere ? SPHERE_LABEL[p.data.sphere] : null,
                      `Diff. ${p.data.difficulty}`,
                    ]
                      .filter(Boolean)
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
          Aucun sortilège ne correspond.
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
