// The optional half of a table: the relay. Either the invite card + the players
// it brings in, or — when no server is attached — the one button that attaches
// one. Nothing here is needed to run a table.

import React from 'react';
import { Share, StyleSheet, View } from 'react-native';
import { Button, Card, IconButton, Switch, Text } from 'react-native-paper';
import QRCode from 'react-native-qrcode-svg';

import { OwnerBadge, PlayerAvatar, StatusPill } from '@/components/campaign/roster-visuals';
import type { Campaign } from '@/db/schema';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';
import { joinLink, type RosterEntry } from '@/lib/campaign-protocol';

export default function TableServerSection({
  campaign,
  players,
  onKick,
  onAttach,
  onToggleShareNpcs,
}: {
  campaign: Campaign;
  /** Roster entries owned by someone else — what the relay is for. */
  players: RosterEntry[];
  onKick: (entry: RosterEntry) => void;
  onAttach: () => void;
  onToggleShareNpcs: (next: boolean) => void;
}) {
  const theme = useProphecyTheme();
  const { code, serverUrl } = campaign;

  if (!code || !serverUrl) {
    return (
      <View
        style={[
          styles.empty,
          { backgroundColor: theme.colors.surfaceVariant, borderColor: theme.colors.outlineVariant, gap: 12 },
        ]}>
        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center' }}>
          Aucun serveur connecté. Connectez-en un pour voir les personnages de vos joueurs en direct
          — le reste de la table fonctionne sans.
        </Text>
        <Button mode="outlined" icon="server-network" onPress={onAttach}>
          Connecter un serveur
        </Button>
      </View>
    );
  }

  const onlinePlayers = players.filter((e) => e.online).length;
  const shareInvite = () =>
    Share.share({
      message:
        `Rejoins ma campagne Prophecy « ${campaign.name} ».\n` +
        `Code : ${code}\n` +
        `Serveur : ${serverUrl}\n` +
        joinLink(code, serverUrl),
    }).catch(() => {});

  return (
    <>
      {/* Invite card — ornate corner brackets, big code, server, QR, share. */}
      <Card mode="outlined" style={[styles.codeCard, { backgroundColor: theme.colors.surfaceVariant }]}>
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
            {code}
          </Text>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
            Serveur : <Text style={{ color: theme.colors.onSurface }}>{serverUrl}</Text>
          </Text>
          <View style={styles.qr}>
            <QRCode
              value={joinLink(code, serverUrl)}
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

      <View style={styles.header}>
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
            Partagez le code ci-dessus. Les personnages des joueurs apparaîtront ici dès qu’ils
            diffusent.
          </Text>
        </View>
      ) : (
        <View style={{ gap: 9 }}>
          {players.map((entry) => (
            <PlayerRow key={entry.charId} entry={entry} onKick={() => onKick(entry)} />
          ))}
        </View>
      )}

      {/* Off by default: the NPCs are read locally, so publishing them is only
          useful to a second GM device. */}
      <View style={styles.switchRow}>
        <View style={{ flex: 1 }}>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurface }}>
            Publier mes PNJ
          </Text>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
            Envoie vos PNJ au serveur (utile pour un co-MJ). Désactivé, ils ne quittent pas cet
            appareil.
          </Text>
        </View>
        <Switch value={campaign.shareNpcs} onValueChange={onToggleShareNpcs} />
      </View>
    </>
  );
}

function PlayerRow({ entry, onKick }: { entry: RosterEntry; onKick: () => void }) {
  const theme = useProphecyTheme();
  const nom = String(entry.character.nom ?? 'Sans nom');
  return (
    <View
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
        onPress={onKick}
      />
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

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  codeCard: { borderRadius: 16 },
  codeContent: { alignItems: 'center', gap: 2, paddingVertical: 20 },
  qr: { paddingVertical: 12 },
  empty: { padding: 20, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 11,
    borderRadius: 13,
    borderWidth: StyleSheet.hairlineWidth,
  },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
});
