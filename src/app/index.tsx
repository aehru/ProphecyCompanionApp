import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { Image } from 'expo-image';
import { type Href, useNavigation, useRouter } from 'expo-router';
import React, { useCallback, useLayoutEffect, useState } from 'react';
import { Alert, FlatList, StyleSheet, View } from 'react-native';
import { IconButton, List, Menu, Text } from 'react-native-paper';

import Icon, { dsIcon } from '@/components/ui/icon';
import AppFab from '@/components/ui/app-fab';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';
import { parseImport } from '@/lib/character-transfer';
import { pickImportText, shareExport } from '@/lib/character-transfer-io';
import { mediaUri } from '@/lib/media';
import { charactersListQuery } from '@/repositories/characters';
import { exportCharacters, importCharacters } from '@/repositories/transfer';

export default function CharactersListScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const theme = useProphecyTheme();
  const { data } = useLiveQuery(charactersListQuery());
  const [menuOpen, setMenuOpen] = useState(false);
  const [busy, setBusy] = useState(false);

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
      const n = await importCharacters(parsed.data);
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
      ),
    });
  }, [navigation, menuOpen, busy, handleExport, handleImport]);

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
          data={data}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          keyExtractor={(c) => String(c.id)}
          renderItem={({ item }) => {
            const avatar = mediaUri(item.avatarPath);
            return (
              <List.Item
                style={[
                  styles.item,
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
                onPress={() => router.push(`/character/${item.id}` as Href)}
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
