import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Text } from 'react-native-paper';

import DieChip from '@/components/ui/die-chip';
import { dsIcon } from '@/components/ui/icon';
import { TENDANCE_BY_KEY } from '@/constants/prophecy';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';
import type { DieReading, RollContext } from '@/lib/roll';

/**
 * The dice that still have something to say, one row each.
 *
 * A cast on the tendance trio can owe up to three rerolls at once — the kept die
 * plus every extreme left on the table — so each gets its own row, its own
 * « Confirmer » and its own reroll chip. One button for all of them would save
 * taps and lose the only thing that matters here: WHICH die produced which
 * outcome.
 *
 * Rows appear for a die awaiting its reroll, for one that already has it, and
 * for the discarded fluctuation die that backlashes with no reroll at all.
 */
export default function RollConfirmations({
  readings,
  context: ctx,
  onConfirm,
}: {
  readings: readonly DieReading[];
  context: RollContext;
  onConfirm: (index: number) => void;
}) {
  const theme = useProphecyTheme();
  const rows = readings.filter((r) => r.awaiting || r.automatic || r.confirmDie != null);
  if (rows.length === 0) return null;

  return (
    <View style={styles.wrap}>
      {rows.map((r) => (
        <View key={r.index} style={styles.row}>
          <View style={styles.text}>
            <Text style={[styles.title, { color: theme.colors.onSurface }]}>{dieName(r)}</Text>
            <Text style={[styles.hint, { color: theme.colors.onSurfaceVariant }]}>
              {explain(r, ctx)}
            </Text>
          </View>
          {r.confirmDie != null ? <DieChip value={r.confirmDie} size={34} muted /> : null}
          {r.awaiting ? (
            <Button
              compact
              mode="outlined"
              icon={dsIcon('dice')}
              onPress={() => onConfirm(r.index)}>
              Confirmer
            </Button>
          ) : null}
        </View>
      ))}
    </View>
  );
}

/** « Dragon 10 » on the trio, « Dé 2 : 10 » on plain dice. */
function dieName(r: DieReading): string {
  const label = r.tendance ? TENDANCE_BY_KEY[r.tendance].label : `Dé ${r.index + 1}`;
  return `${label} ${r.value}`;
}

/** What this die is waiting for, or what it turned out to mean. */
function explain(r: DieReading, ctx: RollContext): string {
  const cast = ctx.kind === 'cast';
  if (r.automatic) return 'Écarté : contrecoup automatique.';
  if (r.verdict === 'miracle') return 'Miracle confirmé.';
  if (r.verdict === 'contrecoup') return 'Contrecoup confirmé.';
  if (r.verdict === 'critique') return 'Critique confirmé.';
  if (r.verdict === 'fumble') return 'Échec critique confirmé.';
  if (r.confirmDie != null) return 'Non confirmé.';
  // Still awaiting: say what the reroll has to do, and what it would cost.
  const outcome = r.natural
    ? r.value === 1
      ? cast
        ? 'un contrecoup'
        : 'un échec critique'
      : cast
        ? 'un miracle'
        : 'un critique'
    : 'un contrecoup';
  return r.value === 1
    ? `Relancez : au-dessus de ${ctx.confirm}, c’est ${outcome}.`
    : `Relancez : sous ${ctx.confirm}, c’est ${outcome}.`;
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  text: { flex: 1, gap: 1 },
  title: { fontFamily: 'Cinzel_600SemiBold', fontSize: 14 },
  hint: { fontSize: 11.5 },
});
