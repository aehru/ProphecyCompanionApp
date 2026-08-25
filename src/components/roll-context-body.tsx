import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Text } from 'react-native-paper';

import NumberField from '@/components/number-field';
import RollVerdict from '@/components/roll-verdict';
import { TendanceDiceRow } from '@/components/tendance-die';
import ChipSelect from '@/components/ui/chip-select';
import DieChip from '@/components/ui/die-chip';
import { dsIcon } from '@/components/ui/icon';
import type { TendanceKey } from '@/constants/prophecy';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';
import {
  awaitsConfirmation,
  contextValue,
  isNeutralDie,
  type DiceMode,
  type RollContext,
  type RollResult,
  type RollThrow,
} from '@/lib/roll';

/**
 * The body of a roll made AGAINST something — a skill's total, a stat, a sum of
 * both. Presentational: every die here was rolled by the dialog, which owns the
 * « Lancer » / « Tendances » buttons in the actions row.
 *
 * The order on screen is the order of the gesture: what you are rolling against,
 * how you are rolling it, the dice, then the reading. The controls sit ABOVE the
 * dice on purpose — the difficulté is the one number a player edits after seeing
 * the result (the GM says « non, 20 »), and re-reading the same dice against it
 * must not look like a reroll.
 */
const MODES: { key: DiceMode; label: string }[] = [
  { key: 'keep', label: 'Garder' },
  { key: 'sum', label: 'Sommer' },
];

export default function RollContextBody({
  context: ctx,
  dice,
  onDice,
  mode,
  onMode,
  difficulty,
  onDifficulty,
  roll,
  tendances,
  confirmDie,
  onKeep,
  onConfirm,
  result,
}: {
  context: RollContext;
  /** Held as text, not a number: an empty field must stay empty while typing. */
  dice: string;
  onDice: (text: string) => void;
  mode: DiceMode;
  onMode: (mode: DiceMode) => void;
  difficulty: string;
  onDifficulty: (text: string) => void;
  /** What was thrown, or null before the first roll. */
  roll: RollThrow | null;
  /** Set when the throw came from the trio: the tendance of each die, in order. */
  tendances: TendanceKey[] | null;
  confirmDie: number | null;
  onKeep: (index: number) => void;
  onConfirm: () => void;
  /** Null until the throw settles — a `keep` has no reading before its pick. */
  result: RollResult | null;
}) {
  const theme = useProphecyTheme();
  const natural = result?.natural ?? null;
  // Several dice, none kept yet: the throw is a question, not an answer.
  const choosing = roll != null && roll.mode === 'keep' && roll.keptIndex == null;

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

      <View style={styles.controls}>
        <NumberField
          fieldKey="dice"
          label="Dés"
          value={dice}
          onChange={(_, t) => onDice(t)}
          maxLength={1}
          style={styles.narrowField}
        />
        <NumberField
          fieldKey="difficulty"
          label="Difficulté"
          value={difficulty}
          onChange={(_, t) => onDifficulty(t)}
          maxLength={2}
          style={styles.difficultyField}
        />
      </View>
      {/* Only worth asking with more than one die — and it has to be asked, since
          effects grant both readings and nothing on the sheet says which. */}
      {dice !== '1' ? (
        <ChipSelect
          label="Plusieurs dés"
          info="Garder : un seul dé compte, celui que vous choisissez. Sommer : les dés s’additionnent. Dans les deux cas, seul le premier dé (ou celui gardé) peut être un critique ou un échec critique."
          options={MODES}
          value={mode}
          onChange={(k) => onMode(k as DiceMode)}
        />
      ) : null}

      {tendances && roll ? (
        <TendanceDiceRow
          rolls={roll.dice.map((value, i) => ({ key: tendances[i], value }))}
          selectedKey={roll.keptIndex == null ? null : tendances[roll.keptIndex]}
          onSelect={(r) => onKeep(tendances.indexOf(r.key))}
        />
      ) : null}

      {roll && !tendances ? (
        <View style={styles.dice}>
          {roll.dice.map((value, i) => (
            <DieChip
              key={i}
              value={value}
              size={44}
              neutral={isNeutralDie(roll, i)}
              selected={roll.mode === 'keep' && roll.dice.length > 1 && roll.keptIndex === i}
              onPress={roll.dice.length > 1 ? () => onKeep(i) : undefined}
              accessibilityLabel={`Garder le dé ${i + 1} : ${value}`}
            />
          ))}
          {confirmDie != null ? <DieChip value={confirmDie} size={44} muted /> : null}
        </View>
      ) : null}
      {tendances && confirmDie != null ? (
        <View style={styles.dice}>
          <DieChip value={confirmDie} size={44} muted />
        </View>
      ) : null}

      {choosing ? (
        <Text style={[styles.hint, { color: theme.colors.onSurfaceVariant }]}>
          {tendances
            ? 'Gardez le dé de la tendance que vous invoquez.'
            : 'Gardez le dé qui compte.'}
        </Text>
      ) : null}

      {awaitsConfirmation(roll, confirmDie) && natural != null ? (
        <View style={styles.confirmRow}>
          <Text style={[styles.hint, { color: theme.colors.onSurfaceVariant }]}>
            {natural === 10
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
  controls: { flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-start', gap: 12 },
  narrowField: { flexGrow: 0, flexBasis: 'auto', width: 48, minWidth: 0 },
  difficultyField: { flexGrow: 0, flexBasis: 'auto', width: 72, minWidth: 0 },
  dice: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 },
  confirmRow: { alignItems: 'center', gap: 8 },
  hint: { fontSize: 12, textAlign: 'center' },
});
