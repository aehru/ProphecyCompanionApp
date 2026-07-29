import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { type Href, Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, Share, StyleSheet, View } from 'react-native';
import {
  ActivityIndicator,
  Button,
  Card,
  Dialog,
  IconButton,
  Portal,
  Text,
} from 'react-native-paper';
import QRCode from 'react-native-qrcode-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import CharacterPickList, {
  type PickableCharacter,
} from '@/components/campaign/character-pick-list';
import { useGmRosterCtx } from '@/components/campaign/gm-roster-provider';
import {
  OwnerBadge,
  PlayerAvatar,
  ServerStatusChip,
  StatusPill,
} from '@/components/campaign/roster-visuals';
import AppFab from '@/components/ui/app-fab';
import type { Campaign } from '@/db/schema';
import { useCampaignLive } from '@/hooks/use-campaign-live';
import { contentWidth } from '@/hooks/use-layout';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';
import { joinLink, type RosterEntry } from '@/lib/campaign-protocol';
import {
  campaignQuery,
  setShared,
  sharesQuery,
  unshareFromServer,
} from '@/repositories/campaigns';
import { charactersListQuery } from '@/repositories/characters';

/**
 * Shared toggle handler for both salons: persist the share row, and when
 * UNsharing while the campaign is not broadcasting, purge the projection from
 * the server best-effort (the ghost-roster fix — while live, the broadcaster
 * sends the `unshare` on the live socket instead).
 */
async function toggleShare(
  campaign: Campaign,
  character: PickableCharacter,
  next: boolean,
  isLiveHere: boolean,
) {
  await setShared(campaign.id, character.id, next);
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
  const { status, serverError, roster, kick } = useGmRosterCtx();
  const onlineCount = roster.filter((e) => e.online).length;

  // GM PNJ sharing: the GM's own characters, shared/broadcast exactly like a
  // player's (one role-aware socket in use-campaign-live).
  const { data: myCharacters } = useLiveQuery(charactersListQuery());
  const { data: shares } = useLiveQuery(sharesQuery(campaign.id), [campaign.id]);
  const sharedIds = (shares ?? []).map((s) => s.characterId);
  const { liveCampaignId, start, stop } = useCampaignLive();
  const isLiveHere = liveCampaignId === campaign.id;
  const [kickTarget, setKickTarget] = useState<RosterEntry | null>(null);

  const confirmKick = (entry: RosterEntry) => {
    kick(entry.charId);
    // A GM kicking their own live PNJ: also drop the local share row, or the
    // broadcaster would re-share it on its next push.
    const mine = (myCharacters ?? []).find((c) => c.uuid === entry.charId);
    if (mine) setShared(campaign.id, mine.id, false).catch(() => {});
    setKickTarget(null);
  };

  const shareInvite = () =>
    Share.share({
      message:
        `Rejoins ma campagne Prophecy « ${campaign.name} ».\n` +
        `Code : ${campaign.code}\n` +
        `Serveur : ${campaign.serverUrl}\n` +
        joinLink(campaign.code, campaign.serverUrl),
    }).catch(() => {});

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Stack.Screen options={{ title: campaign.name }} />
      <ScrollView contentContainerStyle={[styles.scroll, contentWidth]} showsVerticalScrollIndicator={false}>
        <View style={styles.statusRow}>
          <ServerStatusChip status={status} />
          {serverError ? (
            <Text variant="bodySmall" style={{ color: theme.colors.error }}>
              Erreur serveur : {serverError}
            </Text>
          ) : null}
        </View>

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
            {roster.length === 0
              ? 'aucun pour l’instant'
              : `${onlineCount} / ${roster.length} en ligne`}
          </Text>
        </View>

        {roster.length === 0 ? (
          <View
            style={[
              styles.empty,
              { backgroundColor: theme.colors.surfaceVariant, borderColor: theme.colors.outlineVariant },
            ]}>
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center' }}>
              Partagez le code ci-dessus. Les personnages des joueurs apparaîtront ici dès qu’ils
              diffusent.
            </Text>
          </View>
        ) : (
          <View style={{ gap: 9 }}>
            {roster.map((entry) => {
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

        {/* GM PNJ sharing — the GM's own characters, broadcast like a player's. */}
        <View style={styles.rosterHeader}>
          <Text variant="titleSmall" style={{ color: theme.colors.onSurface }}>
            Mes PNJ
          </Text>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
            {sharedIds.length === 0 ? 'aucun partagé' : `${sharedIds.length} partagé${sharedIds.length > 1 ? 's' : ''}`}
          </Text>
        </View>
        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
          Les personnages cochés rejoignent la Compagnie comme PNJ pendant la diffusion.
        </Text>
        <CharacterPickList
          characters={myCharacters ?? []}
          sharedIds={sharedIds}
          onToggle={(c, next) => toggleShare(campaign, c, next, isLiveHere)}
        />
      </ScrollView>

      {/* Kick confirmation — purge only: the player's next share re-adds it. */}
      <Portal>
        <Dialog
          visible={kickTarget != null}
          onDismiss={() => setKickTarget(null)}
          style={[styles.dialog, { borderColor: theme.prophecy.border }]}>
          <Dialog.Title>Retirer de la Compagnie ?</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">
              « {String(kickTarget?.character.nom ?? 'Sans nom')} » sera retiré du serveur. Si son
              joueur diffuse encore, il réapparaîtra à sa prochaine mise à jour.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setKickTarget(null)}>Annuler</Button>
            <Button
              mode="contained"
              icon="account-remove-outline"
              onPress={() => kickTarget && confirmKick(kickTarget)}>
              Retirer
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Primary action: open the full company overview (GM roster with tabs). */}
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
        <View style={styles.bottomBarRow}>
          <Button
            mode="outlined"
            style={{ flex: 1 }}
            icon={isLiveHere ? 'stop-circle-outline' : 'broadcast'}
            disabled={!isLiveHere && sharedIds.length === 0}
            onPress={() => (isLiveHere ? stop() : start(campaign.id))}>
            {isLiveHere ? 'Arrêter' : 'Diffuser'}
          </Button>
          <Button
            mode="contained"
            style={{ flex: 1 }}
            icon="account-group"
            disabled={roster.length === 0}
            onPress={() => router.push(`/campaigns/${campaign.id}/compagnie` as Href)}>
            Compagnie
          </Button>
        </View>
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
  const { data: shares } = useLiveQuery(sharesQuery(campaign.id), [campaign.id]);
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
            onToggle={(c, next) => toggleShare(campaign, c, next, isLiveHere)}
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
  bottomBarRow: { flexDirection: 'row', gap: 10 },
  // DS dialog surface (same as campaigns list / dice roller): tighter radius +
  // a 1px gold hairline (Paper's default Dialog corner balloons and has no border).
  dialog: { borderRadius: 18, borderWidth: 1 },
  consent: {},
  pausePill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
});
