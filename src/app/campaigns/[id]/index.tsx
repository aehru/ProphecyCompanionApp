import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { type Href, Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Button, Divider, Text, TextInput } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import CharacterPickList, {
  type PickableCharacter,
} from '@/components/campaign/character-pick-list';
import { ServerStatusChip } from '@/components/campaign/roster-badges';
import TableNpcSection from '@/components/campaign/table-npc-section';
import TableServerSection from '@/components/campaign/table-server-section';
import { useTableRosterCtx } from '@/components/campaign/table-roster-provider';
import AppFab from '@/components/ui/app-fab';
import DsDialog from '@/components/ui/ds-dialog';
import { dsIcon } from '@/components/ui/icon';
import type { Campaign } from '@/db/schema';
import { useCampaignLive } from '@/hooks/use-campaign-live';
import { contentWidth } from '@/hooks/use-layout';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';
import { Alert } from '@/lib/alert';
import type { RosterEntry } from '@/lib/campaign-protocol';
import {
  attachServer,
  campaignQuery,
  createNpc,
  membersQuery,
  setMember,
  setShareNpcs,
  unshareFromServer,
} from '@/repositories/campaigns';
import { charactersListQuery } from '@/repositories/characters';

/**
 * Shared membership toggle: persist the row, and when REMOVING a character
 * while the campaign is not broadcasting, purge its projection from the server
 * best-effort (the ghost-roster fix — while live, the broadcaster sends the
 * `unshare` on the live socket instead). A local table has nothing to purge.
 */
async function toggleMember(
  campaign: Campaign,
  character: PickableCharacter,
  next: boolean,
  isLiveHere: boolean,
) {
  await setMember(campaign.id, character.id, next);
  if (!next && !isLiveHere && character.uuid) {
    unshareFromServer(campaign, character.uuid).catch(() => {});
  }
}

export default function CampaignSalonScreen() {
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
  return campaign.role === 'gm' ? <GmSalon campaign={campaign} /> : <PlayerSalon campaign={campaign} />;
}

// --- GM lobby --------------------------------------------------------------------

function GmSalon({ campaign }: { campaign: Campaign }) {
  const theme = useProphecyTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { status, serverError, roster, kick, connected } = useTableRosterCtx();
  // Local NPCs vs the players' characters: two sections, two different stories
  // (the first exists offline, the second needs the relay).
  const players = roster.filter((e) => e.owner === 'player');

  const { data: myCharacters } = useLiveQuery(charactersListQuery());
  const { data: members } = useLiveQuery(membersQuery(campaign.id), [campaign.id]);
  const memberIds = (members ?? []).map((m) => m.characterId);
  const { liveCampaignId, start, stop } = useCampaignLive();
  const isLiveHere = liveCampaignId === campaign.id;
  const [kickTarget, setKickTarget] = useState<RosterEntry | null>(null);
  const [npcName, setNpcName] = useState<string | null>(null);
  const [attachUrl, setAttachUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Create the NPC, then land on its sheet: only the name is required, the rest
  // is filled in the character form like any other character.
  const submitNpc = async () => {
    const created = await createNpc(campaign.id, npcName ?? '');
    setNpcName(null);
    router.push(`/character/${created.id}` as Href);
  };

  const submitAttach = async () => {
    setBusy(true);
    try {
      await attachServer(campaign.id, (attachUrl ?? '').trim());
      setAttachUrl(null);
    } catch (e) {
      Alert.alert('Erreur', e instanceof Error ? e.message : 'Connexion au serveur impossible.');
    } finally {
      setBusy(false);
    }
  };

  // Publishing NPCs is opt-in (co-GM case): flipping it on also starts the
  // broadcast, flipping it off purges what is already on the server.
  const toggleShareNpcs = async (next: boolean) => {
    await setShareNpcs(campaign.id, next);
    if (next) start(campaign.id);
    else if (isLiveHere) stop();
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Stack.Screen options={{ title: campaign.name }} />
      <ScrollView contentContainerStyle={[styles.scroll, contentWidth]} showsVerticalScrollIndicator={false}>
        <View style={styles.statusRow}>
          {connected ? (
            <ServerStatusChip status={status} />
          ) : (
            <View style={[styles.pausePill, { backgroundColor: theme.colors.surfaceVariant }]}>
              <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                Table hors ligne
              </Text>
            </View>
          )}
          {connected && serverError ? (
            <Text variant="bodySmall" style={{ color: theme.colors.error }}>
              Erreur serveur : {serverError}
            </Text>
          ) : null}
        </View>

        {/* The table itself works with no server at all, so it comes first. */}
        <TableNpcSection
          characters={myCharacters ?? []}
          memberIds={memberIds}
          onCreate={() => setNpcName('')}
          onToggle={(c, next) => toggleMember(campaign, c, next, isLiveHere)}
        />

        <Divider style={{ backgroundColor: theme.prophecy.borderSoft, marginVertical: 4 }} />

        {/* Everything below needs a relay: it is the bonus, not the feature. */}
        <Text variant="titleSmall" style={{ color: theme.colors.onSurface }}>
          Serveur
        </Text>
        <TableServerSection
          campaign={campaign}
          players={players}
          onKick={setKickTarget}
          onAttach={() => setAttachUrl('')}
          onToggleShareNpcs={toggleShareNpcs}
        />
      </ScrollView>

      {/* Kick confirmation — purge only: the player's next share re-adds it. */}
      <DsDialog
        visible={kickTarget != null}
        onDismiss={() => setKickTarget(null)}
        title="Retirer de la Compagnie ?"
        dismiss={<Button onPress={() => setKickTarget(null)}>Annuler</Button>}
        actions={
          <Button
            mode="contained"
            icon="account-remove-outline"
            onPress={() => {
              if (kickTarget) kick(kickTarget.charId);
              setKickTarget(null);
            }}>
            Retirer
          </Button>
        }>
        <Text variant="bodyMedium">
          « {String(kickTarget?.character.nom ?? 'Sans nom')} » sera retiré du serveur. Si son
          joueur diffuse encore, il réapparaîtra à sa prochaine mise à jour.
        </Text>
      </DsDialog>

      <DsDialog
        visible={npcName != null}
        onDismiss={() => setNpcName(null)}
        title="Nouveau PNJ"
        dismiss={<Button onPress={() => setNpcName(null)}>Annuler</Button>}
        actions={
          <Button testID="dialog-npc-submit" mode="contained" icon={dsIcon('plus')} onPress={submitNpc}>
            Créer
          </Button>
        }>
        <TextInput
          testID="field-npc-name"
          label="Nom"
          value={npcName ?? ''}
          onChangeText={setNpcName}
          autoFocus
        />
        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
          Seul le nom est requis : la fiche s’ouvre ensuite pour compléter ce dont vous avez besoin.
        </Text>
      </DsDialog>

      <DsDialog
        visible={attachUrl != null}
        onDismiss={() => setAttachUrl(null)}
        title="Connecter un serveur"
        dismiss={<Button onPress={() => setAttachUrl(null)}>Annuler</Button>}
        actions={
          <Button
            testID="dialog-attach-submit"
            mode="contained"
            icon="server-network"
            onPress={submitAttach}
            disabled={busy || (attachUrl ?? '').trim().length === 0}
            loading={busy}>
            Connecter
          </Button>
        }>
        {/* `defaultValue`, NOT `value`: a controlled TextInput writes the JS
            string back into the native field on the first keystroke, which
            restarts the Android IME — Gboard then drops off its number page
            back to the letters one, exactly once, mid-way through typing an
            IP. State still follows through onChangeText, and the dialog
            unmounts when hidden, so each open re-reads the prefill. */}
        <TextInput
          testID="field-server-url"
          label="Serveur"
          defaultValue={attachUrl ?? ''}
          onChangeText={setAttachUrl}
          placeholder="exemple.fr ou 192.168.1.10:8000"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
        />
        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
          Le serveur crée le code de la table. Les extraits de fiches que vos joueurs partageront y
          seront conservés sous la responsabilité de son hébergeur.
        </Text>
      </DsDialog>

      {/* Primary action: open the full company overview (roster with tabs). */}
      <View
        style={[
          styles.bottomBar,
          {
            backgroundColor: theme.colors.surface,
            borderTopColor: theme.prophecy.borderSoft,
            // The bar is the last thing on screen, so it has to clear the
            // gesture area / on-screen nav bar itself — AppFab does the same on
            // the screens that use one instead of a bar.
            paddingBottom: 16 + insets.bottom,
          },
        ]}>
        <Button
          testID="open-compagnie"
          mode="contained"
          icon="account-group"
          disabled={roster.length === 0}
          onPress={() => router.push(`/campaigns/${campaign.id}/compagnie` as Href)}>
          La Compagnie
        </Button>
      </View>
    </View>
  );
}

// --- player broadcast -------------------------------------------------------------

function PlayerSalon({ campaign }: { campaign: Campaign }) {
  const theme = useProphecyTheme();
  const { data: characters } = useLiveQuery(charactersListQuery());
  const { data: shares } = useLiveQuery(membersQuery(campaign.id), [campaign.id]);
  const sharedIds = (shares ?? []).map((s) => s.characterId);
  const { liveCampaignId, status, serverError, start, stop } = useCampaignLive();
  const isLiveHere = liveCampaignId === campaign.id;

  const toggleLive = () => {
    if (isLiveHere) stop();
    else start(campaign.id); // one-at-a-time: replaces any other live campaign
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Stack.Screen options={{ title: campaign.name }} />
      <ScrollView contentContainerStyle={[styles.scroll, contentWidth]} showsVerticalScrollIndicator={false}>
        <View style={styles.statusRow}>
          {isLiveHere ? (
            <ServerStatusChip status={status} />
          ) : (
            <View style={[styles.pausePill, { backgroundColor: theme.colors.surfaceVariant }]}>
              <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                Diffusion en pause
              </Text>
            </View>
          )}
          {isLiveHere && serverError ? (
            <Text variant="bodySmall" style={{ color: theme.colors.error }}>
              Erreur serveur : {serverError}
            </Text>
          ) : null}
        </View>

        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
          Serveur : <Text style={{ color: theme.colors.onSurface }}>{campaign.serverUrl}</Text>
        </Text>
        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
          {liveCampaignId != null && !isLiveHere
            ? 'Une autre campagne diffuse déjà ; démarrer ici l’arrêtera.'
            : 'Les personnages cochés sont diffusés en direct au MJ. Arrêter met en pause.'}
        </Text>

        <View style={{ marginTop: 8 }}>
          <CharacterPickList
            characters={characters ?? []}
            sharedIds={sharedIds}
            onToggle={(c, next) => toggleMember(campaign, c, next, isLiveHere)}
          />
        </View>
      </ScrollView>

      <AppFab
        icon={isLiveHere ? 'stop-circle-outline' : 'broadcast'}
        label={isLiveHere ? 'Arrêter' : 'Diffuser'}
        disabled={!isLiveHere && sharedIds.length === 0}
        onPress={toggleLive}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: 16, paddingBottom: 96, gap: 14 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
  bottomBar: { padding: 16, borderTopWidth: StyleSheet.hairlineWidth },
  pausePill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
});
