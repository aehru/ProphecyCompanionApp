import { useLiveQuery } from "drizzle-orm/expo-sqlite";
import { type Href, useNavigation, useRouter } from "expo-router";
import React, { useCallback, useLayoutEffect, useMemo, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, View } from "react-native";
import { IconButton, Text } from "react-native-paper";

import CharacterListItem from "@/components/character-list-item";
import CharacterSelectionActions from "@/components/character-selection-actions";
import DiceRollerButton from "@/components/dice-roller-button";
import ExportIntentDialog from "@/components/export-intent-dialog";
import { dsIcon } from "@/components/ui/icon";
import AppFab from "@/components/ui/app-fab";
import Columns from "@/components/ui/columns";
import GroupedList from "@/components/ui/grouped-list";
import SectionCard from "@/components/ui/section-card";
import { useCampaignLive } from "@/hooks/use-campaign-live";
import { useCharacterSelection } from "@/hooks/use-character-selection";
import { recordBackup } from "@/hooks/use-last-backup";
import { useSplitWidth } from "@/hooks/use-layout";
import { useProphecyTheme } from "@/hooks/use-prophecy-theme";
import { Alert } from "@/lib/alert";
import { type ExportIntent } from "@/lib/character-transfer";
import { shareExport } from "@/lib/character-transfer-io";
import {
  allMembersQuery,
  sharedCharacterNames,
} from "@/repositories/campaigns";
import {
  charactersListQuery,
  deleteCharacters,
} from "@/repositories/characters";
import { duplicateCharacters, exportCharacters } from "@/repositories/transfer";

/** « 3 personnages » / « 1 personnage » — French plural, once. */
const plural = (n: number, word: string) => `${n} ${word}${n > 1 ? "s" : ""}`;

export default function CharactersListScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const theme = useProphecyTheme();
  const { data, updatedAt } = useLiveQuery(charactersListQuery());
  const [busy, setBusy] = useState(false);
  const [askingIntent, setAskingIntent] = useState(false);
  const splitWidth = useSplitWidth();
  // « Diffusé »: shared into the campaign currently broadcasting.
  const { liveCampaignId } = useCampaignLive();
  const { data: members } = useLiveQuery(allMembersQuery());
  const broadcastIds = new Set(
    (members ?? [])
      .filter((m) => m.campaignId === liveCampaignId)
      .map((m) => m.characterId),
  );
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
        if (intent === "backup") await recordBackup();
        clear();
      } catch (e) {
        Alert.alert(
          "Export impossible",
          e instanceof Error ? e.message : String(e),
        );
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
    Alert.alert("Dupliquer", `Dupliquer ${plural(count, "personnage")} ?`, [
      { text: "Annuler", style: "cancel" },
      {
        text: "Dupliquer",
        onPress: async () => {
          setBusy(true);
          try {
            await duplicateCharacters(selectedIds);
            clear();
          } catch (e) {
            Alert.alert(
              "Duplication impossible",
              e instanceof Error ? e.message : String(e),
            );
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
      ? `\n\nPartagé${shared.length > 1 ? "s" : ""} dans une campagne : ${shared.join(", ")}.`
      : "";
    Alert.alert(
      "Supprimer",
      `Supprimer ${plural(count, "personnage")} ? Cette action est définitive.${warning}`,
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: async () => {
            setBusy(true);
            try {
              await deleteCharacters(selectedIds);
              clear();
            } catch (e) {
              Alert.alert(
                "Suppression impossible",
                e instanceof Error ? e.message : String(e),
              );
            } finally {
              setBusy(false);
            }
          },
        },
      ],
    );
  }, [selectedIds, clear]);

  const selectionCount = selectedIds.length;
  const allSelected = selection.allSelected;

  // The header IS the mode indicator: while rows are selected it turns into a
  // contextual bar (count + batch actions), and the normal one comes back on
  // clear. Same Stack screen, no navigation.
  useLayoutEffect(() => {
    if (selection.active) {
      navigation.setOptions({
        title: `${selectionCount} sélectionné${selectionCount > 1 ? "s" : ""}`,
        headerBackVisible: false,
        headerLeft: () => (
          <IconButton
            icon={dsIcon("close")}
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
      title: "Personnages",
      headerBackVisible: true,
      headerLeft: undefined,
      // Import, Apparence, Diagnostic… moved to the « Plus » tab: Personnages
      // keeps only the dice button the tab navigator puts on every tab.
      headerRight: () => <DiceRollerButton />,
    });
  }, [
    navigation,
    busy,
    selection.active,
    selectionCount,
    allSelected,
    toggleAll,
    clear,
    handleDuplicateSelection,
    handleDeleteSelection,
  ]);

  const pcs = (data ?? []).filter((c) => c.kind !== "npc");
  const npcs = (data ?? []).filter((c) => c.kind === "npc");
  const renderRow = (c: (typeof pcs)[number]) => (
    <CharacterListItem
      key={c.id}
      character={c}
      broadcast={broadcastIds.has(c.id)}
      selectionMode={selection.active}
      selected={selection.isSelected(c.id)}
      // A tap opens the sheet normally, but toggles the row once the
      // selection is on — long-press then tap, the usual gesture pair.
      onPress={() =>
        selection.active
          ? selection.toggle(c.id)
          : router.push(`/character/${c.id}` as Href)
      }
      onLongPress={() => selection.toggle(c.id)}
    />
  );

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
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
          ]}
        >
          <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>
            Aucun personnage
          </Text>
          <Text
            variant="bodyMedium"
            style={{ color: theme.colors.onSurfaceVariant }}
          >
            Touchez + pour en créer un.
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={[styles.listContent, splitWidth]}>
          {/* Most players never make a PNJ: without one, the headings would only
              label the obvious, so the list stands bare. */}
          {npcs.length === 0 ? (
            <GroupedList>{pcs.map(renderRow)}</GroupedList>
          ) : (
            <Columns gap={16}>
              {pcs.length ? (
                <SectionCard
                  title="Mes personnages"
                  helper={String(pcs.length)}
                >
                  <GroupedList>{pcs.map(renderRow)}</GroupedList>
                </SectionCard>
              ) : null}
              {/* NPCs are characters too, but a GM's pile of gardes would bury
                the player's own sheet: folded under their own heading while
                there are PCs to show, open when they are all there is. */}
              {npcs.length ? (
                <SectionCard
                  title="PNJ"
                  helper={String(npcs.length)}
                  collapsible
                  defaultExpanded={pcs.length === 0}
                >
                  <GroupedList>{npcs.map(renderRow)}</GroupedList>
                </SectionCard>
              ) : null}
            </Columns>
          )}
        </ScrollView>
      )}
      {/* Creating a character mid-selection makes no sense — the FAB steps out. */}
      {!selection.active && (
        <AppFab
          icon={dsIcon("plus")}
          testID="fab-new-character"
          onPress={() => router.push("/character/new")}
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
  // Clears the FAB so the last row stays tappable.
  listContent: { padding: 16, paddingBottom: 96, gap: 16 },
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    margin: 16,
    padding: 24,
    borderWidth: 1,
    borderRadius: 20,
  },
});
