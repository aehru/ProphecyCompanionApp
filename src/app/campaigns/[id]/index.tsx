import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { type Href, Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, ScrollView, Share, StyleSheet, View } from 'react-native';
import {
  ActivityIndicator,
  Button,
  Card,
  Divider,
  IconButton,
  Switch,
  Text,
  TextInput,
} from 'react-native-paper';
import QRCode from 'react-native-qrcode-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import CharacterPickList, {
  type PickableCharacter,
} from '@/components/campaign/character-pick-list';
import {
  OwnerBadge,
  PlayerAvatar,
  ServerStatusChip,
  StatusPill,
} from '@/components/campaign/roster-visuals';
import { useTableRosterCtx } from '@/components/campaign/table-roster-provider';
import AppFab from '@/components/ui/app-fab';
import DsDialog from '@/components/ui/ds-dialog';
import { dsIcon } from '@/components/ui/icon';
import type { Campaign } from '@/db/schema';
import { useCampaignLive } from '@/hooks/use-campaign-live';
import { contentWidth } from '@/hooks/use-layout';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';
import { joinLink, type RosterEntry } from '@/lib/campaign-protocol';
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
  // Local NPCs vs the players' characters: two different sections, two different
  // stories (the first exists offline, the second needs the relay).
  const players = roster.filter((e) => e.owner === 'player');
  const onlinePlayers = players.filter((e) => e.online).length;

  const { data: myCharacters } = useLiveQuery(charactersListQuery());
  const { data: members } = useLiveQuery(membersQuery(campaign.id), [campaign.id]);
  const memberIds = (members ?? []).map((m) => m.characterId);
  const { liveCampaignId, start, stop } = useCampaignLive();
  const isLiveHere = liveCampaignId === campaign.id;
  const [kickTarget, setKickTarget] = useState<RosterEntry | null>(null);
  const [npcName, setNpcName] = useState<string | null>(null);
  const [attachUrl, setAttachUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const confirmKick = (entry: RosterEntry) => {
    kick(entry.charId);
    setKickTarget(null);
  };

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

  const shareInvite = () => {
    if (!campaign.code || !campaign.serverUrl) return;
    Share.share({
      message:
        `Rejoins ma campagne Prophecy « ${campaign.name} ».\n` +
        `Code : ${campaign.code}\n` +
        `Serveur : ${campaign.serverUrl}\n` +
        joinLink(campaign.code, campaign.serverUrl),
    }).catch(() => {});
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

        {/* The table itself: the NPCs the GM runs. Works with no server at all,
            so it comes first. */}
        <View style={styles.rosterHeader}>
          <Text variant="titleSmall" style={{ color: theme.colors.onSurface }}>
            Mes PNJ
          </Text>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
            {memberIds.length === 0
              ? 'aucun à la table'
              : `${memberIds.length} à la table`}
          </Text>
        </View>
        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
          Les personnages cochés composent la Compagnie : fiches, blessures et initiative, sur cet
          appareil.
        </Text>
        <Button mode="outlined" icon={dsIcon('plus')} onPress={() => setNpcName('')}>
          Nouveau PNJ
        </Button>
        <CharacterPickList
          characters={myCharacters ?? []}
          sharedIds={memberIds}
          onToggle={(c, next) => toggleMember(campaign, c, next, isLiveHere)}
        />

        <Divider style={{ backgroundColor: theme.prophecy.borderSoft, marginVertical: 4 }} />

        {/* Everything below needs a relay: it is the bonus, not the feature. */}
        <Text variant="titleSmall" style={{ color: theme.colors.onSurface }}>
          Serveur
        </Text>

        {connected && campaign.code && campaign.serverUrl ? (
          <>
            {/* Invite card — ornate corner brackets, big code, server, QR, share. */}
            <Card
              mode="outlined"
              style={[styles.codeCard, { backgroundColor: theme.colors.surfaceVariant }]}>
              <Card.Content style={styles.codeContent}>
                <CornerBrackets color={theme.colors.secondary} />
                <Text variant="labelSmall" style={{ letterSpacing: 2, color: theme.colors.onSurfaceVariant }}>
                  CODE DE LA TABLE
                </Text>
                <Text
                  style={{
                    fontFamily: 'Cinzel_600SemiBold',
                    fontSize: 32,
                    letterSpacing: 6,
                    color: theme.colors.primary,
                    marginVertical: 6,
                  }}>
                  {campaign.code}
                </Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  Serveur : <Text style={{ color: theme.colors.onSurface }}>{campaign.serverUrl}</Text>
                </Text>
                <View style={styles.qr}>
                  <QRCode
                    value={joinLink(campaign.code, campaign.serverUrl)}
                    size={132}
                    backgroundColor="transparent"
                    color={theme.colors.onSurface}
                  />
                </View>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 12 }}>
                  Scannez avec l’appareil photo pour rejoindre
                </Text>
                <Button mode="outlined" icon="share-variant" onPress={shareInvite}>
                  Partager l’invitation
                </Button>
              </Card.Content>
            </Card>

            <View style={styles.rosterHeader}>
              <Text variant="titleSmall" style={{ color: theme.colors.onSurface }}>
                Joueurs
              </Text>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                {players.length === 0
                  ? 'aucun pour l’instant'
                  : `${onlinePlayers} / ${players.length} en ligne`}
              </Text>
            </View>

            {players.length === 0 ? (
              <View
                style={[
                  styles.empty,
                  { backgroundColor: theme.colors.surfaceVariant, borderColor: theme.colors.outlineVariant },
                ]}>
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center' }}>
                  Partagez le code ci-dessus. Les personnages des joueurs apparaîtront ici dès
                  qu’ils diffusent.
                </Text>
              </View>
            ) : (
              <View style={{ gap: 9 }}>
                {players.map((entry) => {
                  const nom = String(entry.character.nom ?? 'Sans nom');
                  return (
                    <View
                      key={entry.charId}
                      style={[
                        styles.playerRow,
                        { backgroundColor: theme.colors.surface, borderColor: theme.prophecy.borderSoft },
                      ]}>
                      <PlayerAvatar nom={nom} online={entry.online} size={38} />
                      <Text style={{ flex: 1, fontFamily: 'Cinzel_600SemiBold', color: theme.colors.onSurface }}>
                        {nom}
                      </Text>
                      {entry.owner === 'gm' ? <OwnerBadge /> : null}
                      <StatusPill online={entry.online} />
                      <IconButton
                        icon="account-remove-outline"
                        size={18}
                        style={{ margin: 0 }}
                        accessibilityLabel={`Retirer ${nom}`}
                        onPress={() => setKickTarget(entry)}
                      />
                    </View>
                  );
                })}
              </View>
            )}

            {/* Off by default: the NPCs are read locally, so publishing them is
                only useful to a second GM device. */}
            <View style={styles.switchRow}>
              <View style={{ flex: 1 }}>
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurface }}>
                  Publier mes PNJ
                </Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  Envoie vos PNJ au serveur (utile pour un co-MJ). Désactivé, ils ne quittent pas
                  cet appareil.
                </Text>
              </View>
              <Switch value={campaign.shareNpcs} onValueChange={toggleShareNpcs} />
            </View>
          </>
        ) : (
          <View
            style={[
              styles.empty,
              { backgroundColor: theme.colors.surfaceVariant, borderColor: theme.colors.outlineVariant, gap: 12 },
            ]}>
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center' }}>
              Aucun serveur connecté. Connectez-en un pour voir les personnages de vos joueurs en
              direct — le reste de la table fonctionne sans.
            </Text>
            <Button mode="outlined" icon="server-network" onPress={() => setAttachUrl('')}>
              Connecter un serveur
            </Button>
          </View>
        )}
      </ScrollView>

      {/* Kick confirmation — purge only: the player's next share re-adds it. */}
      <DsDialog
        visible={kickTarget != null}
        onDismiss={() => setKickTarget(null)}
        title="Retirer de la Compagnie ?"
        actions={
          <>
            <Button onPress={() => setKickTarget(null)}>Annuler</Button>
            <Button
              mode="contained"
              icon="account-remove-outline"
              onPress={() => kickTarget && confirmKick(kickTarget)}>
              Retirer
            </Button>
          </>
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
        actions={
          <>
            <Button onPress={() => setNpcName(null)}>Annuler</Button>
            <Button mode="contained" icon={dsIcon('plus')} onPress={submitNpc}>
              Créer
            </Button>
          </>
        }>
        <TextInput label="Nom" value={npcName ?? ''} onChangeText={setNpcName} autoFocus />
        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
          Seul le nom est requis : la fiche s’ouvre ensuite pour compléter ce dont vous avez besoin.
        </Text>
      </DsDialog>

      <DsDialog
        visible={attachUrl != null}
        onDismiss={() => setAttachUrl(null)}
        title="Connecter un serveur"
        actions={
          <>
            <Button onPress={() => setAttachUrl(null)}>Annuler</Button>
            <Button
              mode="contained"
              icon="server-network"
              onPress={submitAttach}
              disabled={busy || (attachUrl ?? '').trim().length === 0}
              loading={busy}>
              Connecter
            </Button>
          </>
        }>
        <TextInput
          label="Serveur"
          value={attachUrl ?? ''}
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

/** Four L-shaped brackets framing the code card (design flourish). */
function CornerBrackets({ color }: { color: string }) {
  const base = { position: 'absolute' as const, width: 18, height: 18, borderColor: color };
  return (
    <>
      <View style={[base, { top: 8, left: 8, borderTopWidth: 1.5, borderLeftWidth: 1.5, borderTopLeftRadius: 4 }]} />
      <View style={[base, { top: 8, right: 8, borderTopWidth: 1.5, borderRightWidth: 1.5, borderTopRightRadius: 4 }]} />
      <View style={[base, { bottom: 8, left: 8, borderBottomWidth: 1.5, borderLeftWidth: 1.5, borderBottomLeftRadius: 4 }]} />
      <View style={[base, { bottom: 8, right: 8, borderBottomWidth: 1.5, borderRightWidth: 1.5, borderBottomRightRadius: 4 }]} />
    </>
  );
}

// --- player broadcast (restyled) -------------------------------------------------

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

        <Text variant="bodySmall" style={[styles.consent, { color: theme.colors.onSurfaceVariant }]}>
          Serveur : <Text style={{ color: theme.colors.onSurface }}>{campaign.serverUrl}</Text>
        </Text>
        <Text variant="bodySmall" style={[styles.consent, { color: theme.colors.onSurfaceVariant }]}>
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
  codeCard: { borderRadius: 16 },
  codeContent: { alignItems: 'center', gap: 2, paddingVertical: 20 },
  qr: { paddingVertical: 12 },
  rosterHeader: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  empty: { padding: 20, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 11,
    borderRadius: 13,
    borderWidth: StyleSheet.hairlineWidth,
  },
  bottomBar: { padding: 16, borderTopWidth: StyleSheet.hairlineWidth },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  consent: {},
  pausePill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
});
