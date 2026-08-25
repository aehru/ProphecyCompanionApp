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

  const terms = [
    `${r.die}`,
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
