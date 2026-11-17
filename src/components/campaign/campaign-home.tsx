// The pieces of the « Campagne » home: the two role cards (MJ / joueur) and a
// table row. Pure presentation — the screen owns the dialogs and the queries.

import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Icon as PaperIcon, Text } from 'react-native-paper';

import IdentityChip from '@/components/ui/identity-chip';
import Icon, { type IconName } from '@/components/ui/icon';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';
import type { Campaign } from '@/db/schema';

/** A role card: engraved title, one line of what it is for, two buttons. */
export function RoleCard({
  icon,
  title,
  body,
  children,
}: {
  icon: IconName;
  title: string;
  body: string;
  /** The buttons — laid out as one row, each taking half. */
  children: React.ReactNode;
}) {
  const theme = useProphecyTheme();
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.prophecy.surfaceContainerLow,
          borderColor: theme.prophecy.border,
        },
      ]}>
      <View style={styles.cardHead}>
        <Icon name={icon} size={20} color={theme.colors.secondary} />
        <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>
          {title}
        </Text>
      </View>
      <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
        {body}
      </Text>
      <View style={styles.cardActions}>{children}</View>
    </View>
  );
}

type Member = { nom: string; kind: 'pc' | 'npc' };

const plural = (n: number, one: string, many: string) => `${n} ${n > 1 ? many : one}`;

/**
 * What a row says under its name. A GM counts the table's local members — the
 * remote players are only known while the roster is connected, so they are not
 * claimed here. A player lists what they broadcast.
 */
export function tableSummary(role: Campaign['role'], members: Member[]): string {
  if (role === 'player') {
    return members.length ? `${members.map((m) => m.nom).join(', ')} diffusé` : 'Rien de diffusé';
  }
  const pcs = members.filter((m) => m.kind === 'pc').length;
  const npcs = members.length - pcs;
  const parts = [
    pcs ? plural(pcs, 'personnage', 'personnages') : null,
    plural(npcs, 'PNJ', 'PNJ'),
  ].filter(Boolean);
  return parts.join(' · ');
}

/**
 * One table in the list. Tap opens it; long press asks to delete — the
 * chevron row has no room for a trash can, and the character list already
 * reserves the long press for « act on this row ».
 */
export function TableRow({
  campaign,
  summary,
  onPress,
  onLongPress,
}: {
  campaign: Campaign;
  summary: string;
  onPress: () => void;
  onLongPress: () => void;
}) {
  const theme = useProphecyTheme();
  const gm = campaign.role === 'gm';
  return (
    <Pressable
      testID={`campaign-row-${campaign.id}`}
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityRole="button"
      accessibilityLabel={campaign.name}
      accessibilityHint="Appui long pour supprimer"
      style={({ pressed }) => [
        styles.row,
        pressed && { backgroundColor: theme.prophecy.surfaceContainer },
      ]}>
      <View style={styles.rowMain}>
        <Text
          variant="bodyLarge"
          numberOfLines={1}
          style={[styles.rowTitle, { color: theme.colors.onSurface }]}>
          {campaign.name}
        </Text>
        <View style={styles.rowMeta}>
          <IdentityChip
            label={gm ? 'MJ' : 'Joueur'}
            color={gm ? theme.colors.onPrimaryContainer : theme.colors.onSurfaceVariant}
            borderColor="transparent"
            fill={gm ? theme.colors.primaryContainer : theme.colors.surfaceVariant}
            style={styles.badge}
          />
          {campaign.serverUrl ? (
            <IdentityChip
              label="Serveur relié"
              color={theme.colors.onTertiaryContainer}
              borderColor="transparent"
              fill={theme.colors.tertiaryContainer}
              style={styles.badge}
            />
          ) : null}
          <Text
            variant="bodySmall"
            numberOfLines={1}
            style={[styles.summary, { color: theme.colors.onSurfaceVariant }]}>
            {summary}
          </Text>
        </View>
      </View>
      <Icon name="chev" size={18} color={theme.colors.onSurfaceVariant} />
    </Pressable>
  );
}

/** The footer line pointing at the privacy page. */
export function ShareNotice({ onRead }: { onRead: () => void }) {
  const theme = useProphecyTheme();
  return (
    <Pressable onPress={onRead} accessibilityRole="link" style={styles.notice}>
      <PaperIcon source="information-outline" size={18} color={theme.colors.onSurfaceVariant} />
      <Text variant="bodyMedium" style={[styles.summary, { color: theme.colors.onSurfaceVariant }]}>
        Ce qui est partagé, et avec qui
      </Text>
      <Text variant="labelLarge" style={{ color: theme.colors.primary }}>
        Lire
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 18, borderWidth: 1, padding: 16, gap: 10 },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardActions: { flexDirection: 'row', gap: 10, marginTop: 6 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  rowMain: { flex: 1, minWidth: 0, gap: 6 },
  rowTitle: { fontWeight: '700' },
  rowMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, flexShrink: 0 },
  summary: { flex: 1, minWidth: 0 },
  notice: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
});
