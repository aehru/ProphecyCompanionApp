import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { Image } from 'expo-image';
import { type Href, useNavigation, useRouter } from 'expo-router';
import React, { useCallback, useLayoutEffect, useState } from 'react';
import { Alert, FlatList, StyleSheet, View } from 'react-native';
import { IconButton, List, Menu, Text } from 'react-native-paper';

import { OwnerBadge } from '@/components/campaign/roster-badges';
import Icon, { dsIcon } from '@/components/ui/icon';
import AppFab from '@/components/ui/app-fab';
import { useLayout, useSplitWidth } from '@/hooks/use-layout';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';
import { parseImport } from '@/lib/character-transfer';
import { pickImportText, shareExport } from '@/lib/character-transfer-io';
import { mediaUri } from '@/lib/media';
import { charactersListQuery } from '@/repositories/characters';
import { duplicateCharacter, exportCharacters, importCharacters } from '@/repositories/transfer';

// Module-level: an inline arrow is a new component type on every render, which
// remounts every separator instead of reusing it.
const RowSeparator = () => <View style={styles.separator} />;
const keyExtractor = (c: { id: number }) => String(c.id);

export default function CharactersListScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const theme = useProphecyTheme();
  const { data } = useLiveQuery(charactersListQuery());
  const [menuOpen, setMenuOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const { columns } = useLayout();
  const splitWidth = useSplitWidth();

  const isEmpty = !data || data.length === 0;

  // Export every character to a shareable JSON file (full backup).
  const handleExport = useCallback(async () => {
    setMenuOpen(false);
    if (isEmpty) {
      Alert.alert('Rien à exporter', 'Créez au moins un personnage.');
      return;
    }
    setBusy(true);
    try {
      await shareExport(await exportCharacters());
    } catch (e) {
      Alert.alert('Export impossible', e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }, [isEmpty]);

  // Long-press a row → full deep copy (new uuid) after confirmation. The live
  // query refreshes the list; no navigation.
  const handleDuplicate = useCallback((id: number, nom: string) => {
    Alert.alert('Dupliquer', `Dupliquer « ${nom || 'Sans nom'} » ?`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Dupliquer',
        onPress: async () => {
          try {
            await duplicateCharacter(id);
          } catch (e) {
            Alert.alert('Duplication impossible', e instanceof Error ? e.message : String(e));
          }
        },
      },
    ]);
  }, []);

  // Pick a JSON export and add its characters (as new entries — never overwrites).
  const handleImport = useCallback(async () => {
    setMenuOpen(false);
    setBusy(true);
    try {
      const raw = await pickImportText();
      if (raw == null) return; // cancelled
      const parsed = parseImport(raw);
      if (!parsed.ok) {
        Alert.alert('Import impossible', parsed.error);
        return;
      }
      const n = importCharacters(parsed.data).length;
      Alert.alert('Import réussi', `${n} personnage${n > 1 ? 's' : ''} ajouté${n > 1 ? 's' : ''}.`);
    } catch (e) {
      Alert.alert('Import impossible', e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }, []);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={{ flexDirection: 'row' }}>
          <IconButton icon="account-group" onPress={() => router.push('/campaigns' as Href)} />
          <Menu
            visible={menuOpen}
            onDismiss={() => setMenuOpen(false)}
            anchor={
              <IconButton
                icon="dots-vertical"
                disabled={busy}
                onPress={() => setMenuOpen(true)}
              />
            }>
            <Menu.Item leadingIcon="export" onPress={handleExport} title="Exporter tout" />
            <Menu.Item leadingIcon="import" onPress={handleImport} title="Importer…" />
          </Menu>
        </View>
      ),
    });
  }, [navigation, router, menuOpen, busy, handleExport, handleImport]);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {isEmpty ? (
        <View
          style={[
            styles.empty,
            {
              backgroundColor: theme.prophecy.surfaceContainerLow,
              borderColor: theme.colors.outlineVariant,
            },
          ]}>
          <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>
            Aucun personnage
          </Text>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
            Touchez + pour en creer un.
          </Text>
        </View>
      ) : (
        <FlatList
          // FlatList refuses to change numColumns in place — remount on rotation.
          key={columns}
          numColumns={columns}
          columnWrapperStyle={columns > 1 ? styles.column : undefined}
          data={data}
          contentContainerStyle={[styles.listContent, splitWidth]}
          ItemSeparatorComponent={RowSeparator}
          keyExtractor={keyExtractor}
          renderItem={({ item }) => {
            const avatar = mediaUri(item.avatarPath);
            return (
              <List.Item
                style={[
                  styles.item,
                  columns > 1 && styles.itemInGrid,
                  {
                    backgroundColor: theme.prophecy.surfaceContainerLow,
                    borderColor: theme.colors.outlineVariant,
                  },
                ]}
                title={item.nom || 'Sans nom'}
                description={item.concept || undefined}
                titleStyle={{ color: theme.colors.onSurface }}
                descriptionStyle={{ color: theme.colors.onSurfaceVariant }}
                left={(p) =>
                  avatar ? (
                    <Image
                      source={avatar}
                      style={[styles.avatar, { borderColor: theme.colors.outlineVariant }]}
                      contentFit="cover"
                    />
                  ) : (
                    <View
                      style={[
                        styles.avatar,
                        styles.avatarFallback,
                        {
                          borderColor: theme.colors.outlineVariant,
                          backgroundColor: theme.colors.surfaceVariant,
                        },
                      ]}>
                      <Icon name="character" size={22} color={theme.colors.onSurfaceVariant} />
                    </View>
                  )
                }
                // NPCs live in the same list as the player characters (they ARE
                // characters) — the badge is the only thing that tells them apart.
                // `p.style` carries List.Item's own centering and margin — drop
                // it and the pill stretches to the full row height.
                right={item.kind === 'npc' ? (p) => <OwnerBadge style={p.style} /> : undefined}
                onPress={() => router.push(`/character/${item.id}` as Href)}
                onLongPress={() => handleDuplicate(item.id, item.nom ?? '')}
              />
            );
          }}
        />
      )}
      <AppFab icon={dsIcon('plus')} onPress={() => router.push('/character/new')} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  listContent: { padding: 12, paddingBottom: 96 },
  separator: { height: 8 },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    margin: 16,
    padding: 24,
    borderWidth: 1,
    borderRadius: 20,
  },
  item: {
    borderWidth: 1,
    borderRadius: 16,
  },
  // Grid mode: each row is a wrapper, so cells must share it and gap themselves.
  column: { gap: 8 },
  // maxWidth only binds a lone item on the last row — without it, it stretches
  // across both columns. flex:1 still wins for a full row (gap makes it < 50%).
  itemInGrid: { flex: 1, maxWidth: '50%' },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignSelf: 'center',
    marginLeft: 8,
  },
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
});
