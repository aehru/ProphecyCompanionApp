import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { type Href, useNavigation, useRouter } from 'expo-router';
import React, { useCallback, useLayoutEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native';
import { Button, IconButton, Menu, Text } from 'react-native-paper';

import CharacterListItem from '@/components/character-list-item';
import CharacterSelectionActions from '@/components/character-selection-actions';
import ExportIntentDialog from '@/components/export-intent-dialog';
import { dsIcon } from '@/components/ui/icon';
import AppFab from '@/components/ui/app-fab';
import { useCharacterSelection } from '@/hooks/use-character-selection';
import { useLayout, useSplitWidth } from '@/hooks/use-layout';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';
import { Alert } from '@/lib/alert';
import { type ExportIntent, parseImport } from '@/lib/character-transfer';
import { pickImportText, shareExport } from '@/lib/character-transfer-io';
import { sharedCharacterNames } from '@/repositories/campaigns';
import { charactersListQuery, deleteCharacters } from '@/repositories/characters';
import { duplicateCharacters, exportCharacters, importCharacters } from '@/repositories/transfer';

// Module-level: an inline arrow is a new component type on every render, which
// remounts every separator instead of reusing it.
const RowSeparator = () => <View style={styles.separator} />;
const keyExtractor = (c: { id: number }) => String(c.id);

/** « 3 personnages » / « 1 personnage » — French plural, once. */
const plural = (n: number, word: string) => `${n} ${word}${n > 1 ? 's' : ''}`;

export default function CharactersListScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const theme = useProphecyTheme();
  const { data, updatedAt } = useLiveQuery(charactersListQuery());
  const [menuOpen, setMenuOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [askingIntent, setAskingIntent] = useState(false);
  const { columns } = useLayout();
  const splitWidth = useSplitWidth();
  // `updatedAt` stays undefined until the query has actually run — useLiveQuery
  // seeds `data` with [], so without it « Aucun personnage » flashes on every
  // cold start before the rows land.
  const loading = updatedAt === undefined;
  const isEmpty = !loading && (!data || data.length === 0);
  const ids = useMemo(() => (data ?? []).map((c) => c.id), [data]);
  const selection = useCharacterSelection(ids);
  const { selectedIds, clear, toggleAll } = selection;

  // Export the selected characters into ONE envelope (same shape as a full
  // backup, just filtered) and hand it to the share sheet. Which intent —
  // sauvegarde (keeps the characters' identity) or partage (a fresh lineage for
  // the recipient) — is asked first, because the file looks the same either way
  // and only the writer knows what it is for. See ExportIntentDialog.
  const handleExport = useCallback(
    async (intent: ExportIntent) => {
      setAskingIntent(false);
      setBusy(true);
      try {
        await shareExport(await exportCharacters(selectedIds, intent), intent);
        clear();
      } catch (e) {
        Alert.alert('Export impossible', e instanceof Error ? e.message : String(e));
      } finally {
        setBusy(false);
      }
    },
    [selectedIds, clear],
  );

  // Deep copy each selected character (new uuid, « … (copie) » name). The live
  // query refreshes the list; no navigation.
  const handleDuplicateSelection = useCallback(() => {
    const count = selectedIds.length;
    Alert.alert('Dupliquer', `Dupliquer ${plural(count, 'personnage')} ?`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Dupliquer',
        onPress: async () => {
          setBusy(true);
          try {
            await duplicateCharacters(selectedIds);
            clear();
          } catch (e) {
            Alert.alert('Duplication impossible', e instanceof Error ? e.message : String(e));
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  }, [selectedIds, clear]);

  // Destructive: confirm first, and name the characters a campaign still lists
  // as members — deleting one leaves a hole in that table's roster.
  const handleDeleteSelection = useCallback(async () => {
    const count = selectedIds.length;
    let shared: string[] = [];
    try {
      shared = await sharedCharacterNames(selectedIds);
    } catch {
      // The warning is a courtesy — never block the deletion on it.
    }
    const warning = shared.length
      ? `\n\nPartagé${shared.length > 1 ? 's' : ''} dans une campagne : ${shared.join(', ')}.`
      : '';
    Alert.alert(
      'Supprimer',
      `Supprimer ${plural(count, 'personnage')} ? Cette action est définitive.${warning}`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            setBusy(true);
            try {
              await deleteCharacters(selectedIds);
              clear();
            } catch (e) {
              Alert.alert('Suppression impossible', e instanceof Error ? e.message : String(e));
            } finally {
              setBusy(false);
            }
          },
        },
      ],
    );
  }, [selectedIds, clear]);

  // Pick a JSON export and read it back. `'restore'` is safe as a blanket mode:
  // the FILE decides per character (`bundleMode`) — a backup carries the uuid and
  // replaces its own character in place, a shared sheet carries none and lands as
  // a new one. The alert says which of the two happened.
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
      const { ids, restored } = await importCharacters(parsed.data, 'restore');
      const added = ids.length - restored;
      const parts: string[] = [];
      if (restored > 0) {
        parts.push(`${plural(restored, 'personnage')} restauré${restored > 1 ? 's' : ''}`);
      }
      if (added > 0) parts.push(`${plural(added, 'personnage')} ajouté${added > 1 ? 's' : ''}`);
      const detail = restored > 0 ? '\n\nUne restauration remplace la fiche déjà présente.' : '';
      Alert.alert('Import réussi', `${parts.join(', ')}.${detail}`);
    } catch (e) {
      Alert.alert('Import impossible', e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }, []);

  const selectionCount = selectedIds.length;
  const allSelected = selection.allSelected;

  // The header IS the mode indicator: while rows are selected it turns into a
  // contextual bar (count + batch actions), and the normal one comes back on
  // clear. Same Stack screen, no navigation.
  useLayoutEffect(() => {
    if (selection.active) {
      navigation.setOptions({
        title: `${selectionCount} sélectionné${selectionCount > 1 ? 's' : ''}`,
        headerBackVisible: false,
        headerLeft: () => (
          <IconButton
            icon={dsIcon('close')}
            accessibilityLabel="Quitter la sélection"
            onPress={clear}
          />
        ),
        headerRight: () => (
          <CharacterSelectionActions
            allSelected={allSelected}
            busy={busy}
            onToggleAll={toggleAll}
            onDuplicate={handleDuplicateSelection}
            onExport={() => setAskingIntent(true)}
            onDelete={handleDeleteSelection}
          />
        ),
      });
      return;
    }
    navigation.setOptions({
      title: 'Personnages',
      headerBackVisible: true,
      headerLeft: undefined,
      headerRight: () => (
        <View style={{ flexDirection: 'row' }}>
          <IconButton
            icon="account-group"
            testID="campaigns-nav"
            onPress={() => router.push('/campaigns' as Href)}
          />
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
            <Menu.Item leadingIcon="import" onPress={handleImport} title="Importer…" />
            <Menu.Item
              leadingIcon="clipboard-text-clock-outline"
              onPress={() => {
                setMenuOpen(false);
                router.push('/diagnostics' as Href);
              }}
              title="Diagnostic"
            />
            <Menu.Item
              leadingIcon="shield-lock-outline"
              onPress={() => {
                setMenuOpen(false);
                router.push('/privacy' as Href);
              }}
              title="Confidentialité"
            />
          </Menu>
        </View>
      ),
    });
  }, [
    navigation,
    router,
    menuOpen,
    busy,
    handleImport,
    selection.active,
    selectionCount,
    allSelected,
    toggleAll,
    clear,
    handleDuplicateSelection,
    handleDeleteSelection,
  ]);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Above the list rather than behind the FAB: generating a PNJ is a GM
          tool, not the way a player creates their character. It steps out
          during a selection, like the FAB. A full GM menu will take it over. */}
      {!selection.active && (
        <View style={[styles.tools, splitWidth]}>
          <Button
            mode="outlined"
            icon={dsIcon('dice')}
            testID="generate-npc"
            onPress={() => router.push('/npc/generate')}>
            Générer un PNJ
          </Button>
        </View>
      )}
      {loading ? (
        <View testID="characters-loading" style={styles.loading}>
          <ActivityIndicator />
        </View>
      ) : isEmpty ? (
        <View
          testID="characters-empty"
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
            Touchez + pour en créer un.
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
          extraData={selectedIds}
          renderItem={({ item }) => (
            <CharacterListItem
              character={item}
              inGrid={columns > 1}
              selectionMode={selection.active}
              selected={selection.isSelected(item.id)}
              // A tap opens the sheet normally, but toggles the row once the
              // selection is on — long-press then tap, the usual gesture pair.
              onPress={() =>
                selection.active
                  ? selection.toggle(item.id)
                  : router.push(`/character/${item.id}` as Href)
              }
              onLongPress={() => selection.toggle(item.id)}
            />
          )}
        />
      )}
      {/* Creating a character mid-selection makes no sense — the FAB steps out. */}
      {!selection.active && (
        <AppFab
          icon={dsIcon('plus')}
          testID="fab-new-character"
          onPress={() => router.push('/character/new')}
        />
      )}

      <ExportIntentDialog
        visible={askingIntent}
        count={selectionCount}
        onDismiss={() => setAskingIntent(false)}
        onChoose={handleExport}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  tools: { paddingHorizontal: 12, paddingTop: 12, alignItems: 'center' },
  listContent: { padding: 12, paddingBottom: 96 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
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
  // Grid mode: each row is a wrapper, so cells must share it and gap themselves.
  column: { gap: 8 },
});
