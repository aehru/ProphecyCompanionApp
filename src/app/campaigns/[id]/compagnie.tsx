import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { Redirect, useLocalSearchParams } from 'expo-router';
import React, { useDeferredValue, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { ActivityIndicator, Snackbar, Text, TextInput } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import InitiativeList from '@/components/campaign/initiative-list';
import RosterList from '@/components/campaign/roster-list';
import { ServerStatusChip } from '@/components/campaign/roster-badges';
import { useTableRosterCtx } from '@/components/campaign/table-roster-provider';
import GmCharacterSheet, { GmSheetBody } from '@/components/gm-character-sheet';
import AppFab from '@/components/ui/app-fab';
import TabPager from '@/components/ui/tab-pager';
import { dsIcon } from '@/components/ui/icon';
import type { Campaign } from '@/db/schema';
import { useLayout } from '@/hooks/use-layout';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';
import { Alert } from '@/lib/alert';
import type { RosterEntry } from '@/lib/campaign-protocol';
import { campaignQuery, gmNotesQuery, spawnNpc, upsertGmNote } from '@/repositories/campaigns';
import { rollInitiativeFor } from '@/repositories/characters';

// Short forms for a narrow column (a phone, or the split view's left pane).
const TABS = [
  { full: 'Attributs', short: 'Attr.' },
  { full: 'Compétences', short: 'Compét.' },
  { full: 'Tendances', short: 'Tend.' },
  { full: 'Initiative', short: 'Init.' },
] as const;
// The first three tabs swap each card's body; Initiative replaces the whole
// list with the table-wide turn order (one row per die, not per character).
const SKILLS_TAB = 1;
const INITIATIVE_TAB = 3;

export default function CompagnieScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data } = useLiveQuery(campaignQuery(Number(id)), [id]);
  const campaign = data?.[0];
  if (!campaign) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
      </View>
    );
  }
  // The Compagnie overview is GM-only; a player deep-linking here bounces back.
  if (campaign.role !== 'gm') return <Redirect href={`/campaigns/${campaign.id}`} />;
  return <Compagnie campaign={campaign} />;
}

function Compagnie({ campaign }: { campaign: Campaign }) {
  const theme = useProphecyTheme();
  const insets = useSafeAreaInsets();
  const { status, serverError, roster, connected } = useTableRosterCtx();
  const { data: notes } = useLiveQuery(gmNotesQuery(campaign.id), [campaign.id]);
  const noteByUuid = new Map((notes ?? []).map((n) => [n.charUuid, n.body]));
  const notedUuids = new Set(noteByUuid.keys());

  const [tab, setTab] = useState(0);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<RosterEntry | null>(null);
  // Opening from the turn order goes straight to editing (that's the point of
  // tapping a PNJ mid-fight); opening from a card starts read-only.
  const [editOnOpen, setEditOnOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  // Only the GM's own NPCs are theirs to roll; players roll their own.
  const npcs = roster.filter((e) => e.owner === 'gm');
  const split = useLayout().columns > 1;

  const openEditing = (entry: RosterEntry) => {
    setEditOnOpen(true);
    setSelected(entry);
  };
  const openReading = (entry: RosterEntry) => {
    setEditOnOpen(false);
    setSelected(entry);
  };

  const duplicate = async (charUuid: string) => {
    const created = await spawnNpc(campaign.id, charUuid);
    if (!created) return;
    // The roster is local, so the copy is on screen before this toast is read.
    setToast(`« ${created.nom} » ajouté à la Compagnie.`);
  };

  // Open a fight in one tap. Re-rolling mid-combat scrambles an order the table
  // is already playing from and can't be undone, so confirm — but only when
  // there is something to lose.
  const rollNpcInitiative = () => {
    const run = async () => {
      const n = await rollInitiativeFor(npcs.map((e) => e.charId));
      setToast(
        n > 0
          ? `Initiative lancée pour ${n} PNJ.`
          : 'Aucun PNJ n’a de dés d’initiative.',
      );
    };
    const alreadyRolled = npcs.some((e) => {
      const init = e.character.initiative as { values?: number[] } | undefined;
      return (init?.values?.length ?? 0) > 0;
    });
    if (!alreadyRolled) {
      run();
      return;
    }
    Alert.alert('Relancer l’initiative ?', 'L’initiative actuelle des PNJ sera remplacée.', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Relancer', onPress: run },
    ]);
  };
  // The search box drives `groupSkills` for EVERY roster card, so filtering a
  // full table is far more work than one keystroke should block on. The input
  // itself stays on `query` (immediate); the cards read the deferred copy, which
  // React re-renders at low priority and abandons when the next key lands.
  const deferredQuery = useDeferredValue(query);
  const stale = query !== deferredQuery;
  // Keep the open sheet live as updates stream in.
  const openEntry = selected ? (roster.find((e) => e.charId === selected.charId) ?? null) : null;

  return (
    <View
      testID="compagnie-screen"
      style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* A local table has no server to report on — the chip would just say
          "hors ligne" forever and read as a fault. */}
      <View style={styles.statusRow}>
        {connected ? <ServerStatusChip status={status} /> : null}
        {connected && serverError ? (
          <Text variant="bodySmall" style={{ color: theme.colors.error }}>
            Erreur serveur : {serverError}
          </Text>
        ) : null}
      </View>

      {/* Big screen: roster on the left, the open character on the right, so
          marking a PNJ's wounds never hides the table. */}
      <View style={split ? styles.splitRow : styles.fill}>
        <View style={styles.fill}>
          <TabPager
            labels={TABS}
            active={tab}
            onChange={setTab}
            headerStyle={styles.tabs}
            // Two panes already fill the width: a page swipe there fights the
            // reading (and the sheet on the right owns its own gestures).
            swipeEnabled={!split}
            renderPage={(index) =>
              index === INITIATIVE_TAB ? (
                // The extra inset clears the roll FAB below.
                <InitiativeList
                  roster={roster}
                  bottomInset={insets.bottom + 72}
                  onSelect={openEditing}
                />
              ) : (
                <View style={styles.fill}>
                  {index === SKILLS_TAB ? (
                    <View style={styles.searchWrap}>
                      <TextInput
                        mode="outlined"
                        dense
                        value={query}
                        onChangeText={setQuery}
                        placeholder="Rechercher une compétence…"
                        left={<TextInput.Icon icon="magnify" />}
                        right={
                          query ? <TextInput.Icon icon="close" onPress={() => setQuery('')} /> : undefined
                        }
                        autoCapitalize="none"
                        autoCorrect={false}
                      />
                    </View>
                  ) : null}
                  <RosterList
                    roster={roster}
                    tab={index}
                    query={index === SKILLS_TAB ? deferredQuery : ''}
                    notedUuids={notedUuids}
                    bottomInset={16 + insets.bottom}
                    stale={index === SKILLS_TAB && stale}
                    onOpen={openReading}
                  />
                </View>
              )
            }
          />

          {/* Inside the left column so the pane's own actions stay clickable. */}
          {tab === INITIATIVE_TAB ? (
            <AppFab
              icon={dsIcon('dice')}
              label="Lancer les PNJ"
              disabled={npcs.length === 0}
              onPress={rollNpcInitiative}
            />
          ) : null}
        </View>

        {split ? (
          <View
            testID="gm-sheet"
            style={[
              styles.pane,
              { backgroundColor: theme.colors.surface, borderLeftColor: theme.prophecy.borderSoft },
            ]}>
            {openEntry ? (
              <GmSheetBody
                key={openEntry.charId}
                embedded
                entry={openEntry}
                note={noteByUuid.get(openEntry.charId) ?? ''}
                onSaveNote={(charUuid, body) => upsertGmNote(campaign.id, charUuid, body)}
                onDuplicate={duplicate}
                startEditing={editOnOpen}
                onDismiss={() => setSelected(null)}
              />
            ) : (
              <View style={styles.centered}>
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center' }}>
                  Choisissez un personnage pour voir sa fiche.
                </Text>
              </View>
            )}
          </View>
        ) : null}
      </View>

      {split ? null : (
        <GmCharacterSheet
          entry={openEntry}
          note={openEntry ? (noteByUuid.get(openEntry.charId) ?? '') : ''}
          onSaveNote={(charUuid, body) => upsertGmNote(campaign.id, charUuid, body)}
          onDuplicate={duplicate}
          startEditing={editOnOpen}
          onDismiss={() => setSelected(null)}
        />
      )}

      <Snackbar visible={toast !== null} onDismiss={() => setToast(null)} duration={2500}>
        {toast ?? ''}
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: 12, flexWrap: 'wrap' },
  tabs: { marginTop: 12, marginHorizontal: 16 },
  searchWrap: { paddingHorizontal: 16, paddingTop: 12 },
  fill: { flex: 1 },
  splitRow: { flex: 1, flexDirection: 'row' },
  pane: {
    flex: 1,
    borderLeftWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
  },
});
