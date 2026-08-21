// One rolled PNJ, as the generator screen shows it before anything is written.
//
// A summary, not a sheet: the numbers a GM checks to decide « oui, celui-là » —
// name, caste, the eight caractéristiques, the wound track, the compétences.
// Everything else waits for the fiche.

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

import CasteChip from '@/components/caste-chip';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';
import { CARACTERISTIQUES, WOUND_LEVELS } from '@/constants/prophecy';
import { asNumRecord } from '@/lib/character-values';
import type { GeneratedNpc } from '@/lib/npc-generator';

/** « FOR 5 · RÉS 4 · … » — the sheet's own abbreviations, in the sheet's order. */
function caracLine(values: Record<string, number>): string {
  return CARACTERISTIQUES.map((c) => `${c.abbr} ${values[c.key] ?? 0}`).join('  ·  ');
}

/** « 3/2/1/1/1 » — égratignure to mort, the order the fiche prints them in. */
function woundLine(values: Record<string, number>): string {
  return WOUND_LEVELS.map((w) => values[`${w.key}Max`] ?? 0).join('/');
}

export default function NpcPreviewCard({ npc }: { npc: GeneratedNpc }) {
  const theme = useProphecyTheme();
  // The app's one cast for reading stat columns by key (lib/character-values).
  const values = asNumRecord(npc.character);
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.prophecy.surfaceContainerLow,
          borderColor: theme.colors.outlineVariant,
        },
      ]}>
      <View style={styles.header}>
        <Text variant="titleSmall" style={{ color: theme.colors.onSurface }}>
          {npc.character.nom}
        </Text>
        <CasteChip caste={npc.character.caste} />
      </View>

      <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
        {caracLine(values)}
      </Text>

      <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
        Blessures {woundLine(values)} · Maîtrise {npc.character.maitriseMax} · Chance{' '}
        {npc.character.chanceMax} · Initiative {npc.character.initiativeMax}
      </Text>

      <Text variant="bodySmall" style={{ color: theme.colors.onSurface }}>
        {npc.skills.map((s) => `${s.name} ${s.value}`).join('  ·  ')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: 6, padding: 12, borderRadius: 14, borderWidth: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
});
