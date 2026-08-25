import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Text } from 'react-native-paper';

import NumberField from '@/components/number-field';
import RollVerdict from '@/components/roll-verdict';
import { TendanceDiceRow } from '@/components/tendance-die';
import DieChip from '@/components/ui/die-chip';
import { dsIcon } from '@/components/ui/icon';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';
import type { TendanceRoll } from '@/lib/dice';
import { awaitsConfirmation, contextValue, type RollContext, type RollResult } from '@/lib/roll';

/**
 * The body of a roll made AGAINST something — a skill's total, a stat, a sum of
 * both. Presentational: every die here was rolled by the dialog, which owns the
 * « Lancer » / « Tendances » buttons in the actions row.
 *
 * The order on screen is the order of the gesture: what you are rolling against,
 * the difficulté you are rolling at, the dice, then the reading. The difficulté
 * sits ABOVE the dice on purpose — it is the one number a player edits after
 * seeing the result (the GM says « non, 20 »), and re-reading the same dice
 * against it must not look like a reroll.
 */
export default function RollContextBody({
  context: ctx,
  difficulty,
  onDifficulty,
  die,
  confirmDie,
  tendances,
  selectedKey,
  onSelectTendance,
  onConfirm,
  result,
}: {
  context: RollContext;
  /** Held as text, not a number: an empty field must stay empty while typing. */
  difficulty: string;
  onDifficulty: (text: string) => void;
  /** The die the roll rests on — null while a tendance trio awaits its pick. */
  die: number | null;
  confirmDie: number | null;
  tendances: TendanceRoll[] | null;
  selectedKey: TendanceRoll['key'] | null;
  onSelectTendance: (roll: TendanceRoll) => void;
  onConfirm: () => void;
  /** Null until a die is settled, or while the difficulté field is empty. */
  result: RollResult | null;
}) {
  const theme = useProphecyTheme();
  const chips = [
    die != null && !tendances ? { key: 'die', value: die, muted: false } : null,
    confirmDie != null ? { key: 'confirm', value: confirmDie, muted: true } : null,
  ].filter((c) => c != null);

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Text variant="titleMedium" style={{ fontFamily: 'Cinzel_600SemiBold' }}>
          {ctx.label}
        </Text>
        <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 12 }}>
          {ctx.parts.map((p) => `${p.label} ${p.value}`).join(' + ')}
          {ctx.parts.length > 1 ? ` = ${contextValue(ctx)}` : ''}
          {ctx.confirmLabel ? ` · ${ctx.confirmLabel} ${ctx.confirm}` : ''}
        </Text>
      </View>

      <View style={styles.difficulty}>
        <NumberField
          fieldKey="difficulty"
          label="Difficulté"
          value={difficulty}
          onChange={(_, t) => onDifficulty(t)}
          maxLength={2}
          style={styles.difficultyField}
        />
      </View>

      {tendances ? (
        <TendanceDiceRow
          rolls={tendances}
          selectedKey={selectedKey}
          onSelect={onSelectTendance}
        />
      ) : null}
      {tendances && selectedKey == null ? (
        <Text style={[styles.hint, { color: theme.colors.onSurfaceVariant }]}>
          Gardez le dé de la tendance que vous invoquez.
        </Text>
      ) : null}

      {/* One row for the dice that are still on the table. The kept die is drawn
          here ONLY when it didn't come from the trio — a tendance die is already
          on screen in its own colours, and drawing it twice reads as two rolls. */}
      {chips.length > 0 ? (
        <View style={styles.dice}>
          {chips.map((c) => (
            <DieChip key={c.key} value={c.value} muted={c.muted} size={44} />
          ))}
        </View>
      ) : null}

      {awaitsConfirmation(die, confirmDie) ? (
        <View style={styles.confirmRow}>
          <Text style={[styles.hint, { color: theme.colors.onSurfaceVariant }]}>
            {die === 10
              ? `Un 10 : relancez, sous ${ctx.confirm} c’est un critique.`
              : `Un 1 : relancez, au-dessus de ${ctx.confirm} c’est un échec critique.`}
          </Text>
          <Button mode="outlined" icon={dsIcon('dice')} onPress={onConfirm}>
            Confirmer
          </Button>
        </View>
      ) : null}

      {result ? <RollVerdict result={result} context={ctx} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 12 },
  header: { alignItems: 'center', gap: 2 },
  difficulty: { alignItems: 'center' },
  difficultyField: { flexGrow: 0, flexBasis: 'auto', width: 72, minWidth: 0 },
  dice: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
  confirmRow: { alignItems: 'center', gap: 8 },
  hint: { fontSize: 12, textAlign: 'center' },
});
