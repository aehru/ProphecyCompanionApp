import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

import { TRAIT_KIND_LABEL, TRAIT_RARITY_LABEL } from '@/constants/prophecy';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';

/**
 * The read-only body of one avantage / désavantage: a « Désavantage · Commun ·
 * 2 points » line, the mechanical summary, then the rulebook paragraph.
 *
 * Shared by the catalogue row's preview and the character's editor, so what a
 * player reads before taking an entry is what they read afterwards. `cost` is
 * a single number on a taken row and the whole list of prices on a catalogue
 * entry (« 1, 2 ou 3 points »), which is why it comes in as text.
 *
 * The mechanical summary comes FIRST when there is one — it is the sentence
 * looked up mid-game — with the rulebook paragraph under it, unchanged. An entry
 * carrying no summary renders the paragraph alone, exactly as before, which is
 * the normal state while the catalogue is filled section by section.
 */
export default function TraitDetail({
  kind,
  rarity,
  cost,
  description,
  inGameEffect,
  evolving,
}: {
  kind: string;
  rarity: string;
  /** Already formatted — see `traitCostLabel`. */
  cost: string;
  description: string;
  /** The extracted mechanical half. Empty on most entries; see the schema. */
  inGameEffect?: string;
  /** Carries the rulebook's asterisk — see `traitEvolvingLabel`. */
  evolving?: boolean;
}) {
  const theme = useProphecyTheme();
  const meta = [TRAIT_KIND_LABEL[kind] ?? kind, TRAIT_RARITY_LABEL[rarity] ?? rarity, cost]
    .filter((s) => s.trim() !== '')
    .join(' · ');

  return (
    <View style={styles.root}>
      <Text style={[styles.meta, { color: theme.colors.primary }]}>{meta}</Text>
      {evolving ? (
        <Text style={[styles.evolving, { color: theme.colors.onSurfaceVariant }]}>
          {traitEvolvingLabel(kind)}
        </Text>
      ) : null}
      {inGameEffect?.trim() ? (
        <Text style={[styles.body, { color: theme.colors.onSurface }]}>{inGameEffect.trim()}</Text>
      ) : null}
      {description.trim() !== '' ? (
        <Text
          style={[
            styles.body,
            // Dimmed under a summary: the paragraph stays readable and stays the
            // source of truth, but it is no longer what the eye lands on first.
            inGameEffect?.trim()
              ? { color: theme.colors.onSurfaceVariant }
              : { color: theme.colors.onSurface },
          ]}>
          {description.trim()}
        </Text>
      ) : null}
    </View>
  );
}

/**
 * What the rulebook's asterisk means, which depends on the side: a marked
 * désavantage can be shed during play, a marked avantage can be picked up.
 * Spelled out rather than reproduced as a bare « * » — the legend for it is on
 * a page the player does not have in front of them.
 */
export function traitEvolvingLabel(kind: string): string {
  return kind === 'avantage'
    ? 'Peut apparaître en cours de campagne'
    : 'Peut être surmonté en cours de campagne';
}

const styles = StyleSheet.create({
  root: { gap: 6, paddingBottom: 10 },
  meta: { fontSize: 12, letterSpacing: 0.3 },
  body: { fontSize: 13, lineHeight: 19 },
  evolving: { fontSize: 12, fontStyle: 'italic' },
});
