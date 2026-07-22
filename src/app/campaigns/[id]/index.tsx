import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { type Href, Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, Share, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Button, Card, RadioButton, Text } from 'react-native-paper';
import QRCode from 'react-native-qrcode-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useGmRosterCtx } from '@/components/campaign/gm-roster-provider';
import {
  PlayerAvatar,
  ServerStatusChip,
  StatusPill,
} from '@/components/campaign/roster-visuals';
import AppFab from '@/components/ui/app-fab';
import type { Campaign } from '@/db/schema';
import { useCampaignLive } from '@/hooks/use-campaign-live';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';
import { joinLink } from '@/lib/campaign-protocol';
import { campaignQuery, setShared, sharesQuery } from '@/repositories/campaigns';
import { charactersListQuery } from '@/repositories/characters';

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
  const { status, serverError, roster } = useGmRosterCtx();
  const onlineCount = roster.filter((e) => e.online).length;

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
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
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
                  <StatusPill online={entry.online} />
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

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
        <Button
          mode="contained"
          icon="account-group"
          disabled={roster.length === 0}
          onPress={() => router.push(`/campaigns/${campaign.id}/compagnie` as Href)}>
          Ouvrir la Compagnie
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
  const { data: shares } = useLiveQuery(sharesQuery(campaign.id), [campaign.id]);
  // v1: one shared character per campaign.
  const sharedCharacterId = shares?.[0]?.characterId ?? null;
  const { liveCampaignId, status, serverError, start, stop } = useCampaignLive();
  const isLiveHere = liveCampaignId === campaign.id;

  const select = async (characterId: number | null) => {
    if (sharedCharacterId != null && sharedCharacterId !== characterId) {
      await setShared(campaign.id, sharedCharacterId, false);
    }
    if (characterId != null) await setShared(campaign.id, characterId, true);
  };

  const toggleLive = () => {
    if (isLiveHere) stop();
    else start(campaign.id); // one-at-a-time: replaces any other live campaign
  };

  const shareable = (characters ?? []).filter((c) => c.uuid != null);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Stack.Screen options={{ title: campaign.name }} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
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
            : 'Le personnage sélectionné est diffusé en direct au MJ. Arrêter met en pause.'}
        </Text>

        <View style={{ gap: 9, marginTop: 8 }}>
          <PickRow
            label="Ne rien partager"
            checked={sharedCharacterId == null}
            onPress={() => select(null)}
          />
          {shareable.map((c) => (
            <PickRow
              key={c.id}
              label={c.nom || 'Sans nom'}
              nom={c.nom || 'Sans nom'}
              checked={sharedCharacterId === c.id}
              onPress={() => select(c.id)}
            />
          ))}
        </View>
      </ScrollView>

      <AppFab
        icon={isLiveHere ? 'stop-circle-outline' : 'broadcast'}
        label={isLiveHere ? 'Arrêter' : 'Diffuser'}
        disabled={!isLiveHere && sharedCharacterId == null}
        onPress={toggleLive}
      />
    </View>
  );
}

function PickRow({
  label,
  nom,
  checked,
  onPress,
}: {
  label: string;
  nom?: string;
  checked: boolean;
  onPress: () => void;
}) {
  const theme = useProphecyTheme();
  return (
    <View
      style={[
        styles.playerRow,
        {
          backgroundColor: theme.colors.surface,
          borderColor: checked ? theme.colors.primary : theme.prophecy.borderSoft,
        },
      ]}>
      {nom ? (
        <PlayerAvatar nom={nom} online={checked} size={38} />
      ) : (
        <View style={{ width: 38 }} />
      )}
      <Text style={{ flex: 1, fontFamily: 'Cinzel_600SemiBold', color: theme.colors.onSurface }}>
        {label}
      </Text>
      <RadioButton
        value={label}
        status={checked ? 'checked' : 'unchecked'}
        onPress={onPress}
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
  consent: {},
  pausePill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
});
