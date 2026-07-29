import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { Searchbar, Text } from 'react-native-paper';

import Icon from '@/components/ui/icon';
import { SHIELD_CATALOG, type ShieldPreset } from '@/data/shield-catalog';
import { useCharacterId } from '@/hooks/use-character-id';
import { contentWidth } from '@/hooks/use-layout';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';
import { createShield } from '@/repositories/shields';

/**
 * Shield catalogue picker (modal). Flat list, no category grouping (shields
 * are one kind, unlike armor's three weight classes) — mirrors the spell
 * catalogue's structure. Select a preset to add it and jump into its editor,
 * or start from a blank custom shield.
 */
export default function ShieldCatalogModal() {
  const numId = useCharacterId();
  const router = useRouter();
  const theme = useProphecyTheme();
  const [query, setQuery] = useState('');

  const q = query.trim().toLowerCase();
  const filtered = useMemo(
    () =>
      q === ''
        ? SHIELD_CATALOG
        : SHIELD_CATALOG.filter((p) => (p.data.name ?? '').toLowerCase().includes(q)),
    [q],
  );

  const add = async (preset?: ShieldPreset) => {
    const row = await createShield(numId, preset?.data);
    router.replace(`/character/${numId}/shield/${row.id}`);
  };

  return (
    <KeyboardAwareScrollView contentContainerStyle={[styles.container, contentWidth]} bottomOffset={24}>
      <Searchbar
        placeholder="Rechercher un bouclier"
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
          <Text style={styles.name}>Bouclier personnalisé</Text>
          <Text style={[styles.sub, { color: theme.colors.onSurfaceVariant }]}>Partir de zéro</Text>
        </View>
        <Icon name="chev" size={18} color={theme.colors.onSurfaceVariant} />
      </Pressable>

      {filtered.map((p) => (
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
            <Text style={[styles.sub, { color: theme.colors.onSurfaceVariant }]} numberOfLines={1}>
              {[p.data.damage, `Défense ${p.data.defenseMax}`, p.data.prerequisites]
                .filter((s) => s && String(s).trim() !== '')
                .join(' · ')}
            </Text>
          </View>
          <Icon name="chev" size={18} color={theme.colors.onSurfaceVariant} />
        </Pressable>
      ))}

      {filtered.length === 0 ? (
        <Text style={[styles.empty, { color: theme.colors.onSurfaceVariant }]}>
          Aucun bouclier ne correspond.
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
