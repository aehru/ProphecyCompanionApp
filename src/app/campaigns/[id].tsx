import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import {
  ActivityIndicator,
  Button,
  Card,
  Chip,
  Dialog,
  List,
  Portal,
  RadioButton,
  Text,
  TextInput,
} from 'react-native-paper';

import { WOUND_LEVELS } from '@/constants/prophecy';
import type { Campaign } from '@/db/schema';
import { useGmRoster } from '@/hooks/use-gm-roster';
import { usePlayerCampaignSync } from '@/hooks/use-player-campaign-sync';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';
import type { SocketStatus } from '@/lib/campaign-client';
import { charactersListQuery } from '@/repositories/characters';
import {
  campaignQuery,
  gmNotesQuery,
  setShared,
  sharesQuery,
  upsertGmNote,
} from '@/repositories/campaigns';

export default function CampaignDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const campaignId = Number(id);
  const { data } = useLiveQuery(campaignQuery(campaignId), [campaignId]);
  const campaign = data?.[0];
  if (!campaign) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
      </View>
    );
  }
  return campaign.role === 'gm' ? (
    <GmView campaign={campaign} />
  ) : (
    <PlayerView campaign={campaign} />
  );
}

// --- shared bits ----------------------------------------------------------------

const STATUS_LABEL: Record<SocketStatus, string> = {
  online: 'En ligne',
  connecting: 'Connexion…',
  offline: 'Hors ligne',
};

function StatusChip({ status }: { status: SocketStatus }) {
  const theme = useProphecyTheme();
  return (
    <Chip
      compact
      icon={status === 'online' ? 'lan-connect' : 'lan-disconnect'}
      style={{
        backgroundColor:
          status === 'online' ? theme.prophecy.surfaceContainerLow : theme.colors.surfaceVariant,
      }}>
      {STATUS_LABEL[status]}
    </Chip>
  );
}

// --- player side -----------------------------------------------------------------

function PlayerView({ campaign }: { campaign: Campaign }) {
  const theme = useProphecyTheme();
  const { data: characters } = useLiveQuery(charactersListQuery());
  const { data: shares } = useLiveQuery(sharesQuery(campaign.id), [campaign.id]);
  // v1: one shared character per campaign (the schema allows more; the sync
  // hook is single-character, so the UI enforces one for now).
  const sharedCharacterId = shares?.[0]?.characterId ?? null;
  const { status, serverError, unshare } = usePlayerCampaignSync(campaign, sharedCharacterId);

  const select = async (characterId: number | null) => {
    if (sharedCharacterId != null && sharedCharacterId !== characterId) {
      unshare(); // withdraw the previous character from the server first
      await setShared(campaign.id, sharedCharacterId, false);
    }
    if (characterId != null) await setShared(campaign.id, characterId, true);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <StatusChip status={status} />
        {serverError ? (
          <Text variant="bodySmall" style={{ color: theme.colors.error }}>
            Erreur serveur : {serverError}
          </Text>
        ) : null}
      </View>
      <Text variant="bodySmall" style={[styles.consent, { color: theme.colors.onSurfaceVariant }]}>
        Partagé avec le MJ : nom, état de combat, caractéristiques et tendances. Jamais partagés :
        biographie, notes, argent, magie. Désélectionnez pour effacer du serveur.
      </Text>
      <FlatList
        data={(characters ?? []).filter((c) => c.uuid != null)}
        contentContainerStyle={styles.listContent}
        keyExtractor={(c) => String(c.id)}
        ListHeaderComponent={
          <List.Item
            title="Ne rien partager"
            left={() => (
              <RadioButton
                value="none"
                status={sharedCharacterId == null ? 'checked' : 'unchecked'}
                onPress={() => select(null)}
              />
            )}
            onPress={() => select(null)}
          />
        }
        renderItem={({ item }) => (
          <List.Item
            title={item.nom || 'Sans nom'}
            description={item.concept || undefined}
            left={() => (
              <RadioButton
                value={String(item.id)}
                status={sharedCharacterId === item.id ? 'checked' : 'unchecked'}
                onPress={() => select(item.id)}
              />
            )}
            onPress={() => select(item.id)}
          />
        )}
      />
    </View>
  );
}

// --- GM side ----------------------------------------------------------------------

/** Compact wound summary from the opaque projection, e.g. "Égr 1/3 · Gra 2/5". */
function woundsLine(character: Record<string, unknown>): string {
  const wounds = character.wounds as
    | Record<string, { current?: number; max?: number }>
    | undefined;
  if (!wounds) return '';
  return WOUND_LEVELS.map((w) => {
    const pool = wounds[w.key];
    if (!pool || !pool.max) return null;
    return `${w.label.slice(0, 3)} ${pool.current ?? 0}/${pool.max}`;
  })
    .filter(Boolean)
    .join(' · ');
}

function GmView({ campaign }: { campaign: Campaign }) {
  const theme = useProphecyTheme();
  const { status, serverError, roster } = useGmRoster(campaign);
  const { data: notes } = useLiveQuery(gmNotesQuery(campaign.id), [campaign.id]);
  const noteByUuid = new Map((notes ?? []).map((n) => [n.charUuid, n.body]));
  const [editing, setEditing] = useState<{ charUuid: string; nom: string } | null>(null);
  const [draft, setDraft] = useState('');

  const openNote = (charUuid: string, nom: string) => {
    setDraft(noteByUuid.get(charUuid) ?? '');
    setEditing({ charUuid, nom });
  };
  const saveNote = async () => {
    if (editing) await upsertGmNote(campaign.id, editing.charUuid, draft);
    setEditing(null);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <StatusChip status={status} />
        {serverError ? (
          <Text variant="bodySmall" style={{ color: theme.colors.error }}>
            Erreur serveur : {serverError}
          </Text>
        ) : null}
      </View>
      <Card
        mode="outlined"
        style={[styles.codeCard, { backgroundColor: theme.prophecy.surfaceContainerLow }]}>
        <Card.Content style={styles.codeContent}>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
            Code de la campagne — à partager avec vos joueurs
          </Text>
          <Text variant="headlineMedium" style={{ color: theme.colors.onSurface, letterSpacing: 4 }}>
            {campaign.code}
          </Text>
        </Card.Content>
      </Card>

      {roster.length === 0 ? (
        <Text variant="bodyMedium" style={[styles.consent, { color: theme.colors.onSurfaceVariant }]}>
          Aucun personnage partagé pour l’instant.
        </Text>
      ) : (
        <FlatList
          data={roster}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          keyExtractor={(e) => e.charId}
          renderItem={({ item }) => {
            const nom = String(item.character.nom ?? 'Sans nom');
            const conditions = String(item.character.conditions ?? '');
            const note = noteByUuid.get(item.charId);
            return (
              <Card mode="outlined" onPress={() => openNote(item.charId, nom)}>
                <Card.Title
                  title={nom}
                  subtitle={item.online ? 'En ligne' : 'Hors ligne'}
                  right={() => (
                    <View
                      style={[
                        styles.presenceDot,
                        {
                          backgroundColor: item.online
                            ? theme.prophecy.surfaceContainerLow
                            : theme.colors.surfaceVariant,
                          borderColor: item.online ? theme.colors.primary : theme.colors.outline,
                        },
                      ]}
                    />
                  )}
                />
                <Card.Content style={styles.cardBody}>
                  {woundsLine(item.character) ? (
                    <Text variant="bodySmall">{woundsLine(item.character)}</Text>
                  ) : null}
                  {conditions ? (
                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                      {conditions}
                    </Text>
                  ) : null}
                  {note ? (
                    <Text
                      variant="bodySmall"
                      numberOfLines={2}
                      style={{ color: theme.colors.onSurfaceVariant, fontStyle: 'italic' }}>
                      📝 {note}
                    </Text>
                  ) : null}
                </Card.Content>
              </Card>
            );
          }}
        />
      )}

      <Portal>
        <Dialog visible={editing !== null} onDismiss={() => setEditing(null)}>
          <Dialog.Title>Notes — {editing?.nom}</Dialog.Title>
          <Dialog.Content>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              multiline
              numberOfLines={6}
              placeholder="Vos notes privées (jamais envoyées au serveur ni au joueur)."
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setEditing(null)}>Annuler</Button>
            <Button onPress={saveNote}>Enregistrer</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  consent: { paddingHorizontal: 16, paddingVertical: 8 },
  listContent: { padding: 16 },
  codeCard: { marginHorizontal: 16, marginTop: 12 },
  codeContent: { alignItems: 'center', gap: 4 },
  cardBody: { gap: 4 },
  presenceDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    marginRight: 16,
  },
});
