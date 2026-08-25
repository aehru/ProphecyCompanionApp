import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

import { useProphecyTheme } from '@/hooks/use-prophecy-theme';
import type { RollContext, RollResult } from '@/lib/roll';

/**
 * The reading of a contextual roll: the verdict, then the arithmetic that
 * produced it.
 *
 * The sum is spelled out rather than summarised because the app is not the
 * authority at the table — a player who reads « 6 + 12 (Équitation) + 5
 * (critique) = 23 » can check it against the GM's own reading in one glance, and
 * disagree with it. A bare « Réussite · 2 NR » gives them nothing to argue with.
 */
/** Always signed, unlike `fmtSignedMod`, which prints a bare 0 — « 6 0 (X) »
 *  would read as a typo in the middle of a sum. */
const term = (n: number) => (n < 0 ? `${n}` : `+${n}`);

export default function RollVerdict({
  result: r,
  context: ctx,
}: {
  result: RollResult;
  context: RollContext;
}) {
  const theme = useProphecyTheme();

  const verdict = r.fumble
    ? 'Échec critique'
    : r.success
      ? `Réussite${r.nr > 0 ? ` · ${r.nr} NR` : ''}`
      : 'Échec';
  // A confirmed critique is stated even on a failure: +5 was not enough here,
  // but the player still rolled one and the GM may care.
  const color = r.fumble || !r.success ? theme.colors.error : theme.colors.primary;

  // Magic's own outcomes, named on their own line. Several can land at once — a
  // Miracle on the kept die while a discarded one backlashes — and the reading
  // states all of them rather than picking a winner: what a miraculous backlash
  // means at the table is the GM's to settle, not the app's.
  const spellNotes = r.verdicts
    .filter((v) => v === 'miracle' || v === 'contrecoup')
    .map((v) => (v === 'miracle' ? 'Miracle' : 'Contrecoup'));

  // The dice come first, spelled out when several were summed — « 4 + 6 + 3 »
  // shows where a 13 came from, which a lone total cannot. A KEPT die is printed
  // alone: the dice it beat are on screen above and never entered the sum.
  const diceTerm =
    r.mode === 'sum' && r.dice.length > 1 ? r.dice.join(' + ') : `${r.diceTotal}`;

  const terms = [
    diceTerm,
    ...ctx.parts.map((p) => `${term(p.value)} (${p.label})`),
    r.critical ? `+${r.bonus} (critique)` : null,
  ].filter(Boolean);

  return (
    <View style={styles.wrap}>
      <Text variant="titleMedium" style={{ color, fontFamily: 'Cinzel_600SemiBold' }}>
        {verdict}
      </Text>
      {r.critical && !r.fumble ? (
        <Text variant="labelMedium" style={{ color: theme.colors.primary }}>
          Critique confirmé
        </Text>
      ) : null}
      {spellNotes.length > 0 ? (
        <Text
          variant="labelMedium"
          style={{
            // A Contrecoup anywhere in the throw tints the line, even beside a
            // Miracle: the backlash is the half a player must not miss.
            color: spellNotes.includes('Contrecoup') ? theme.colors.error : theme.colors.primary,
          }}>
          {spellNotes.join(' · ')}
        </Text>
      ) : null}
      <Text style={[styles.sum, { color: theme.colors.onSurfaceVariant }]}>
        {terms.join(' ')} = {r.total} · difficulté {r.difficulty}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 2 },
  sum: { fontSize: 12, textAlign: 'center' },
});
