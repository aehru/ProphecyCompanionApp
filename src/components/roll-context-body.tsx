import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

import NumberField from '@/components/number-field';
import RollConfirmations from '@/components/roll-confirmations';
import RollVerdict from '@/components/roll-verdict';
import { TendanceDiceRow } from '@/components/tendance-die';
import ChipSelect from '@/components/ui/chip-select';
import DieChip from '@/components/ui/die-chip';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';
import type { TendanceRoll } from '@/lib/dice';
import {
  contextValue,
  diceCount,
  isNeutralDie,
  readDice,
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

/** Bigger than the free-form roller's: these dice are the point of the screen. */
const DIE_SIZE = 44;

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
  confirms,
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
  /** The same dice as `roll`, carrying their colours, when it came from the trio. */
  tendances: TendanceRoll[] | null;
  /** Each die's reroll, by the same index — a cast on the trio can owe three. */
  confirms: (number | null)[];
  onKeep: (index: number) => void;
  onConfirm: (index: number) => void;
  /** Null until the throw settles — a `keep` has no reading before its pick. */
  result: RollResult | null;
}) {
  const theme = useProphecyTheme();
  // Read off the THROW, not off `result`: the result is withheld while the
  // difficulté field is empty, and whether a die wants confirming has nothing to
  // do with the difficulté. Taking it from the result hid « Confirmer » the
  // moment the field was cleared.
  // The result already read every die; re-reading only for the case it withholds
  // (an empty difficulté field) keeps the rows and the verdict describing the
  // very same reading, and skips a second pass on every other render.
  const readings = result?.readings ?? (roll ? readDice(roll, ctx, confirms) : []);
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
          effects grant both readings and nothing on the sheet says which. Read
          through diceCount, so an emptied field counts as the one die it throws
          rather than showing a toggle over nothing. */}
      {diceCount(Number(dice)) > 1 ? (
        <ChipSelect
          label="Plusieurs dés"
          info="Garder : un seul dé compte, celui que vous choisissez. Sommer : les dés s’additionnent. Dans les deux cas, seul le premier dé (ou celui gardé) peut être un critique ou un échec critique."
          options={MODES}
          value={mode}
          onChange={(k) => onMode(k as DiceMode)}
        />
      ) : null}

      {/* The throw: coloured d10s when it came from the trio, plain chips
          otherwise. The confirmation rerolls live below, one row per die that
          owes one — a cast on the trio can owe three at once. */}
      {roll && tendances ? (
        <TendanceDiceRow
          rolls={tendances}
          selectedIndex={roll.keptIndex}
          onSelect={onKeep}
        />
      ) : null}
      {roll && !tendances ? (
        <View style={styles.dice}>
          {roll.dice.map((value, i) => (
            <DieChip
              key={i}
              value={value}
              size={DIE_SIZE}
              neutral={isNeutralDie(roll, i)}
              selected={roll.mode === 'keep' && roll.dice.length > 1 && roll.keptIndex === i}
              onPress={roll.dice.length > 1 ? () => onKeep(i) : undefined}
              accessibilityLabel={`Garder le dé ${i + 1} : ${value}`}
            />
          ))}
        </View>
      ) : null}
      {choosing ? (
        <Text style={[styles.hint, { color: theme.colors.onSurfaceVariant }]}>
          {tendances
            ? 'Gardez le dé de la tendance que vous invoquez.'
            : 'Gardez le dé qui compte.'}
        </Text>
      ) : null}

      <RollConfirmations readings={readings} context={ctx} onConfirm={onConfirm} />

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
  hint: { fontSize: 12, textAlign: 'center' },
});
