// Who is at the table: the avatar, the presence pill, the PNJ badge, and the
// server-connection chip. Pure presentation — every prop is a plain string /
// boolean the caller read off the projection.

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Chip, Text } from 'react-native-paper';

import { initials, playerAccent } from '@/components/campaign/roster-accents';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';
import type { SocketStatus } from '@/lib/campaign-client';

const SERVER_STATUS_LABEL: Record<SocketStatus, string> = {
  online: 'En ligne',
  connecting: 'Connexion…',
  offline: 'Hors ligne',
};

/** Server-connection chip (distinct from a player's presence pill). */
export function ServerStatusChip({ status }: { status: SocketStatus }) {
  const theme = useProphecyTheme();
  return (
    <Chip
      compact
      icon={status === 'online' ? 'lan-connect' : 'lan-disconnect'}
      style={{
        backgroundColor:
          status === 'online' ? theme.prophecy.surfaceContainerLow : theme.colors.surfaceVariant,
      }}>
      {SERVER_STATUS_LABEL[status]}
    </Chip>
  );
}

/** Round initials chip with the player accent and a presence dot. */
export function PlayerAvatar({
  nom,
  online,
  size = 42,
}: {
  nom: string;
  online: boolean;
  size?: number;
}) {
  const theme = useProphecyTheme();
  const accent = playerAccent(nom);
  const dot = Math.max(9, Math.round(size * 0.26));
  return (
    <View style={{ width: size, height: size }}>
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: `${accent}22`,
          borderWidth: 1.5,
          borderColor: accent,
        }}>
        <Text style={{ fontFamily: 'Cinzel_600SemiBold', fontSize: size * 0.34, color: accent }}>
          {initials(nom)}
        </Text>
      </View>
      <View
        style={{
          position: 'absolute',
          bottom: -1,
          right: -1,
          width: dot,
          height: dot,
          borderRadius: dot / 2,
          borderWidth: 2,
          borderColor: theme.colors.surface,
          backgroundColor: online ? theme.colors.primary : theme.colors.outline,
        }}
      />
    </View>
  );
}

/** Presence badge — replaces the design's HP-derived status pill (wounds dropped). */
export function StatusPill({ online }: { online: boolean }) {
  const theme = useProphecyTheme();
  const color = online ? theme.colors.primary : theme.colors.onSurfaceVariant;
  return (
    <View
      style={[
        styles.pill,
        {
          backgroundColor: online ? `${theme.colors.primary}22` : theme.colors.surfaceVariant,
        },
      ]}>
      <Text style={[styles.pillLabel, { color }]}>{online ? 'En ligne' : 'Hors ligne'}</Text>
    </View>
  );
}

/** Ownership badge — marks entries the GM runs themselves (their NPCs). */
export function OwnerBadge() {
  const theme = useProphecyTheme();
  return (
    <View style={[styles.pill, { backgroundColor: `${theme.colors.secondary}22` }]}>
      <Text style={[styles.pillLabel, { color: theme.colors.secondary }]}>PNJ</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  pillLabel: { fontSize: 10, fontWeight: '700' },
});
