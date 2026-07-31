// The read-only blocks of the GM's character sheet. Split out of
// gm-character-sheet.tsx so that file stays the sheet's composition and these
// stay dumb: each takes the values it draws and nothing else.

import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text, TextInput } from 'react-native-paper';

import { TendanceRing } from '@/components/campaign/stat-tiles';
import StatChip from '@/components/ui/stat-chip';
import {
  EFFECT_TARGET_LABEL,
  EFFECT_UNIT_LABEL,
  RESOURCES,
  TENDANCES,
} from '@/constants/prophecy';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';
import type { NumRecord, PoolRecord, SharedEffectView } from '@/lib/shared-character-view';

/** Maîtrise / Chance pools, read-only (the editor covers them when editing). */
export function ResourceTiles({ resources }: { resources: PoolRecord }) {
  const theme = useProphecyTheme();
  return (
    <View style={styles.grid}>
      {RESOURCES.map((r) => {
        const pool = resources[r.key];
        return (
          <View
            key={r.key}
            style={[
              styles.poolTile,
              { backgroundColor: theme.colors.surfaceVariant, borderColor: theme.prophecy.borderSoft },
            ]}>
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
              {r.label}
            </Text>
            <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>
              {pool?.current ?? 0} / {pool?.max ?? 0}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

/** The three tendance rings: 0–10 sub-level filled, main value under it. */
export function TendanceRings({
  tend,
  colors,
}: {
  tend: NumRecord;
  colors: Record<string, string>;
}) {
  const theme = useProphecyTheme();
  return (
    <View style={styles.tendRow}>
      {TENDANCES.map((t) => (
        <View key={t.key} style={styles.tendCell}>
          <TendanceRing
            value={tend[t.key] ?? 0}
            fill={tend[`${t.key}Sub`] ?? 0}
            color={colors[t.key]}
            size={82}
          />
          <Text style={{ fontSize: 12, fontWeight: '600', color: theme.colors.onSurface }}>
            {t.label}
          </Text>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
            {tend[`${t.key}Sub`] ?? 0}/10
          </Text>
        </View>
      ))}
    </View>
  );
}

/** Active bonus/malus, with the remaining duration in its own unit. */
export function EffectsList({ effects }: { effects: SharedEffectView[] }) {
  const theme = useProphecyTheme();
  return (
    <View style={styles.effectList}>
      {effects.map((e, i) => {
        const v = e.value ?? 0;
        const target = EFFECT_TARGET_LABEL[e.target ?? 'all'] ?? e.target ?? 'Tous les jets';
        const unit = EFFECT_UNIT_LABEL[e.durationUnit ?? 'round'] ?? e.durationUnit ?? '';
        return (
          <View key={`${e.label}-${i}`} style={styles.effectRow}>
            <Text style={{ flex: 1, color: theme.colors.onSurface }} numberOfLines={1}>
              {e.label || 'Effet'} · {target}
            </Text>
            <Text
              style={{
                fontFamily: 'Cinzel_600SemiBold',
                color: v < 0 ? theme.colors.error : theme.colors.primary,
              }}>
              {v > 0 ? `+${v}` : v}
            </Text>
            <Text
              variant="bodySmall"
              style={[styles.effectDuration, { color: theme.colors.onSurfaceVariant }]}>
              {e.durationUnit === 'permanent' ? unit : `${e.durationRemaining ?? 0} ${unit}`}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

/**
 * Rolled dice, read like the player's own sheet: wound malus badged on each,
 * error border once a die is driven to 0 or below (the action is lost).
 */
export function InitiativeChips({
  values,
  max,
  wound,
}: {
  values: number[];
  max: number;
  wound: number;
}) {
  const theme = useProphecyTheme();
  if (values.length === 0) {
    return (
      <Text variant="bodyMedium" style={{ color: theme.colors.onSurface }}>
        {`${max} dé(s)`}
      </Text>
    );
  }
  return (
    <View style={styles.grid}>
      {values.map((val, i) => (
        <StatChip
          key={i}
          label={`Dé ${i + 1}`}
          value={String(val)}
          modifier={wound}
          style={
            val > 0 && val + wound <= 0
              ? { borderColor: theme.colors.error, borderWidth: 1.5 }
              : undefined
          }
        />
      ))}
    </View>
  );
}

/**
 * The GM's private note field. Owns the draft so keystrokes stay local; the
 * parent reads the latest text off `draftRef` when saving. Never leaves the
 * device — it isn't part of the shared projection.
 */
export function GmNotes({
  note,
  draftRef,
}: {
  note: string;
  draftRef: React.MutableRefObject<string>;
}) {
  const [draft, setDraft] = useState(note);
  draftRef.current = draft;
  return (
    <TextInput
      value={draft}
      onChangeText={setDraft}
      multiline
      numberOfLines={4}
      placeholder="Jamais envoyées au serveur ni au joueur."
    />
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  poolTile: {
    flexGrow: 1,
    flexBasis: 100,
    alignItems: 'center',
    gap: 2,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  tendRow: { flexDirection: 'row', justifyContent: 'space-around', gap: 6 },
  tendCell: { alignItems: 'center', gap: 6 },
  effectList: { gap: 6 },
  effectRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  effectDuration: { minWidth: 64, textAlign: 'right' },
});
