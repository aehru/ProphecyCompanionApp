import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

import type { StatutPreset } from '@/data/status-catalog';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';
import { rungLabel } from '@/lib/statut';

/**
 * One rung of a caste's Statut ladder, read-only. Shared by the character's
 * chip dialog and the Catalogues tab, so what a player reads before reaching a
 * Statut is what they read afterwards — same treatment `TraitDetail` gets.
 *
 * Rulebook order: what it requires, what it grants, then the named Technique
 * the book prints in italics under the bénéfice. The Technique is the block a
 * player actually looks up mid-game, so it is set apart in gold rather than
 * folded into the bénéfice paragraph.
 *
 * `requis` is prose and stays prose — nothing here is checked against the sheet
 * (see the StatutPreset doc comment).
 */
export default function StatutDetail({
  rung,
  /** Dims the whole block — used for the rung a character has not reached yet. */
  muted = false,
}: {
  rung: StatutPreset;
  muted?: boolean;
}) {
  const theme = useProphecyTheme();
  const body = muted ? theme.colors.onSurfaceVariant : theme.colors.onSurface;

  return (
    <View style={styles.root}>
      <Text style={[styles.meta, { color: theme.colors.primary }]}>{rungLabel(rung)}</Text>

      <Text style={[styles.label, { color: theme.colors.onSurfaceVariant }]}>Requiert</Text>
      <Text style={[styles.body, { color: theme.colors.onSurfaceVariant }]}>{rung.requis}</Text>

      <Text style={[styles.label, { color: theme.colors.onSurfaceVariant }]}>Bénéfice</Text>
      <Text style={[styles.body, { color: body }]}>{rung.benefice}</Text>

      {rung.technique ? (
        <View style={[styles.technique, { borderColor: theme.colors.secondary }]}>
          <Text style={[styles.techniqueName, { color: theme.colors.secondary }]}>
            {rung.technique.nom}
          </Text>
          <Text style={[styles.body, { color: body }]}>{rung.technique.effet}</Text>
        </View>
      ) : null}

      {rung.note.trim() !== '' ? (
        <Text style={[styles.note, { color: theme.colors.onSurfaceVariant }]}>
          * {rung.note.trim()}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 6, paddingBottom: 10 },
  meta: { fontSize: 12, letterSpacing: 0.3 },
  label: { fontSize: 11, letterSpacing: 0.5, textTransform: 'uppercase' },
  body: { fontSize: 13, lineHeight: 19 },
  // A left rule rather than a filled card: the Technique has to read as part of
  // the rung, not as a second entry under it.
  technique: { borderLeftWidth: 2, paddingLeft: 10, gap: 4, marginTop: 2 },
  techniqueName: { fontSize: 13, fontFamily: 'Cinzel_600SemiBold' },
  note: { fontSize: 12, fontStyle: 'italic' },
});
