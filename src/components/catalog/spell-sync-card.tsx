import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

import ChipSelect from '@/components/ui/chip-select';
import {
  DISCIPLINE_LABEL,
  SPELL_TAG_LABEL,
  SPHERE_LABEL,
  TIME_UNIT_LABEL,
} from '@/constants/prophecy';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';
import type { SpellSyncEntry, SyncColumn, SyncValue } from '@/lib/spell-sync';

/**
 * What each catalogue-owned column is called on screen. Kept here rather than in
 * `lib/spell-sync`: the engine compares columns and has no business naming them
 * in French.
 */
const COLUMN_LABEL: Record<SyncColumn, string> = {
  name: 'Nom',
  level: 'Niveau',
  complexity: 'Complexité',
  discipline: 'Discipline',
  sphere: 'Sphère',
  dragonOnly: 'Réservé',
  cost: 'Coût',
  castTimeAmount: 'Incantation',
  castTimeUnit: "Unité d'incantation",
  difficulty: 'Difficulté',
  cle: 'Clés',
  effect: 'Effet',
  inGameEffect: 'Effet en jeu',
  sensoryEffect: 'Perception',
  duration: 'Durée',
  durationUnit: 'Unité de durée',
  targets: 'Cibles',
  tags: 'Mots-clés',
};

/**
 * A column's value as the player reads it elsewhere in the app — a sphère by its
 * accented label, a dragon as « Mage de Kroryn », an empty column as an em dash
 * so "the catalogue removes this" is visible rather than blank.
 */
export function formatSyncValue(column: SyncColumn, value: SyncValue): string {
  if (Array.isArray(value)) {
    if (value.length === 0) return '—';
    return value.map((t) => SPELL_TAG_LABEL[t] ?? t).join(', ');
  }
  // The restriction reads as a plain yes/no here: WHICH dragon comes from the
  // spell's sphère, which this row is not changing.
  if (typeof value === 'boolean') return value ? 'Oui' : 'Non';
  if (typeof value === 'number') return String(value);
  if (value === '') return '—';
  if (column === 'discipline') return DISCIPLINE_LABEL[value] ?? value;
  if (column === 'sphere') return SPHERE_LABEL[value] ?? value;
  if (column === 'castTimeUnit' || column === 'durationUnit') return TIME_UNIT_LABEL[value] ?? value;
  return value;
}

/** The columns a fill touches, named — « Complété : Réservé, Durée ». */
export function fillSummary(entry: SpellSyncEntry): string {
  return (Object.keys(entry.fills) as SyncColumn[]).map((c) => COLUMN_LABEL[c]).join(', ');
}

/**
 * One sortilège whose catalogue entry has moved in a way the player has to rule
 * on: the columns where the sheet and the rulebook disagree, side by side, and a
 * single choice for the whole spell.
 *
 * ONE decision per spell and not per column on purpose — a sortilège is read as
 * one paragraph, and « je garde mon effet mais je prends leur durée » is a state
 * nobody can check afterwards. Keeping the player's values is the default, here
 * as everywhere: the catalogue corrects itself, it does not overrule a sheet.
 */
export default function SpellSyncCard({
  entry,
  characterNom,
  accepted,
  onChange,
}: {
  entry: SpellSyncEntry;
  characterNom: string;
  accepted: boolean;
  onChange: (accepted: boolean) => void;
}) {
  const theme = useProphecyTheme();
  const fills = fillSummary(entry);

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: theme.colors.surface, borderColor: theme.prophecy.borderSoft },
      ]}>
      <Text variant="titleMedium" style={styles.name}>
        {entry.name || 'Sortilège'}
      </Text>
      <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
        {characterNom || 'Personnage'}
      </Text>

      <View style={styles.changes}>
        {entry.conflicts.map((c) => (
          <View key={c.column} style={styles.change}>
            <Text variant="labelLarge" style={{ color: theme.colors.onSurfaceVariant }}>
              {COLUMN_LABEL[c.column]}
            </Text>
            <ValueRow label="Sur la fiche" value={formatSyncValue(c.column, c.mine)} />
            <ValueRow label="Catalogue" value={formatSyncValue(c.column, c.theirs)} />
          </View>
        ))}
      </View>

      {fills !== '' ? (
        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
          Sera complété dans tous les cas : {fills}.
        </Text>
      ) : null}

      <ChipSelect
        options={CHOICES}
        value={accepted ? 'catalog' : 'mine'}
        onChange={(key) => onChange(key === 'catalog')}
        testIDPrefix={`sync-${entry.spellId}`}
      />
    </View>
  );
}

const CHOICES = [
  { key: 'mine', label: 'Garder ma version' },
  { key: 'catalog', label: 'Prendre le catalogue' },
] as const;

function ValueRow({ label, value }: { label: string; value: string }) {
  const theme = useProphecyTheme();
  return (
    <View style={styles.valueRow}>
      <Text variant="bodySmall" style={[styles.valueLabel, { color: theme.colors.onSurfaceVariant }]}>
        {label}
      </Text>
      <Text variant="bodyMedium" style={styles.value}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 12, padding: 14, gap: 6 },
  name: { fontFamily: 'Cinzel_600SemiBold' },
  changes: { gap: 12, marginTop: 6 },
  change: { gap: 2 },
  valueRow: { flexDirection: 'row', gap: 8 },
  valueLabel: { width: 92 },
  value: { flex: 1 },
});
