// What the enchanter rolled, and what it bought.
//
// Shown by the enchant row and by the editor, so the numbers a player scans in
// the list are the numbers the editor explains. Everything below the stored pair
// (score + difficulté) is derived on the spot by `lib/enchant-score` — the NR,
// and through it the durée and the number of cibles the source sortilège locked
// in at enchanting time.

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

import { timeUnitLabel } from '@/constants/prophecy';
import type { Enchant, Spell } from '@/db/schema';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';
import { enchantScoreReading } from '@/lib/enchant-score';
import { spellFormulaResult } from '@/lib/formula';

export default function EnchantScoreSummary({
  enchant: e,
  spell,
}: {
  enchant: Enchant;
  /** The source sortilège, when the link still resolves — supplies durée/cibles. */
  spell?: Spell;
}) {
  const theme = useProphecyTheme();
  const reading = enchantScoreReading(e.castScore, e.difficulty);
  if (!reading) return null;

  // The NR is fixed for good — it was rolled once, by whoever made the object —
  // so the formulas resolve to real numbers here where a spell card can only
  // print them symbolically. The sphère stays unresolved on purpose: it is the
  // ENCHANTER's, and this sheet does not know it.
  const nr = reading.success ? reading.nr : null;
  const duration = spellFormulaResult(spell?.duration, { nr });
  const targets = spellFormulaResult(spell?.targets, { nr });

  const head = [
    `Score ${reading.score}`,
    `Diff. ${reading.difficulty}`,
    reading.success ? `Réussite · NR ${reading.nr}` : 'Échec',
  ].join(' · ');

  return (
    <View style={styles.root}>
      <Text
        style={[styles.head, { color: reading.success ? theme.colors.primary : theme.colors.error }]}>
        {head}
      </Text>
      {duration ? (
        <Text style={[styles.line, { color: theme.colors.onSurfaceVariant }]}>
          Durée : {duration} {timeUnitLabel(spell?.durationUnit ?? '', Number(duration) || null)}
        </Text>
      ) : null}
      {targets ? (
        <Text style={[styles.line, { color: theme.colors.onSurfaceVariant }]}>Cibles : {targets}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 2 },
  head: { fontSize: 13, fontWeight: '600' },
  line: { fontSize: 12 },
});
