import { useState } from 'react';
import { Button } from 'react-native-paper';

import RollContextBody from '@/components/roll-context-body';
import RollFreeformBody from '@/components/roll-freeform-body';
import DsDialog from '@/components/ui/ds-dialog';
import { dsIcon } from '@/components/ui/icon';
import { rollDice, rollDie, rollTendances, type TendanceRoll } from '@/lib/dice';
import {
  DEFAULT_DICE,
  DEFAULT_DIFFICULTY,
  DIE_SIDES,
  diceCount,
  resolveRoll,
  type DiceMode,
  type RollContext,
  type RollResult,
  type RollThrow,
} from '@/lib/roll';

/**
 * The dice roller, in its two shapes.
 *
 * WITHOUT a context it is the free-form roller it has always been: any XdY, plus
 * the tendance trio as a reading. WITH one — a skill's TOT, a stat, a sum of
 * both — it becomes a TEST: the XdY picker gives way to a difficulté and a
 * verdict, because Prophecy tests a D10 and nothing else.
 *
 * Both buttons stay in both shapes. « Lancer » rolls the one die, « Tendances »
 * rolls all three and, in context, the player keeps the one they invoke — that
 * kept die IS the roll, and it is what a 10 or a 1 is confirmed on.
 *
 * This component owns the dice and nothing else draws them: the two bodies are
 * presentational, so there is exactly one place where a die is rolled and one
 * place where the rules read it (`lib/roll`).
 *
 * The dialog only exists while open — `DiceRollerProvider` mounts it on demand —
 * so everything here starts fresh on every open, matching the "no roll history"
 * decision. The one thing that outlives an open is the die size, which the
 * provider holds: reopening the roller keeps the die you picked (for the session,
 * not across restarts).
 */

/**
 * Everything one throw put on the table. ONE state, not five: every transition
 * below names the whole next table, so a new roll cannot leave a stale die, an
 * orphaned confirmation or a kept tendance behind it — which is exactly what
 * five independent setters and a "remember to clear first" helper allowed.
 */
interface RollState {
  /** The contextual throw and how it reads — see `lib/roll` RollThrow. */
  roll: RollThrow | null;
  /** Each die's confirmation reroll, by the same index — a cast can owe three. */
  confirms: (number | null)[];
  /** The free-form XdY throw; never set in context (a test is D10s only). */
  freeform: number[] | null;
}

const EMPTY: RollState = { roll: null, confirms: [], freeform: null };

/**
 * The trio as the dice rows want it — value plus colour, in throw order.
 *
 * DERIVED, never stored: `RollThrow.tendances` already carries the keys because
 * the rules need them, and keeping a second parallel array of the same dice is
 * how the two would come to disagree about which die is which.
 */
function tendanceRolls(t: RollThrow | null): TendanceRoll[] | null {
  if (t?.tendances == null) return null;
  return t.tendances.map((key, i) => ({ key, value: t.dice[i] }));
}

/**
 * Throw `n` D10 for a test. A single die needs no choosing, so it is kept on the
 * spot — that is what makes the ordinary one-die roll show its verdict straight
 * away while a handful waits for a pick.
 */
function throwFor(n: number, mode: DiceMode): RollThrow {
  const count = diceCount(n);
  return {
    dice: rollDice(count, DIE_SIDES),
    mode,
    keptIndex: mode === 'keep' && count === 1 ? 0 : null,
  };
}

export default function DiceRollerDialog({
  sides,
  context,
  onSidesChange,
  onDismiss,
}: {
  sides: number;
  /** What the roll is made against, or null for the free-form roller. */
  context?: RollContext | null;
  /** Lifted so the picked die survives closing and reopening the dialog. */
  onSidesChange: (sides: number) => void;
  onDismiss: () => void;
}) {
  const [count, setCount] = useState('1');
  const [difficulty, setDifficulty] = useState(String(context?.difficulty ?? DEFAULT_DIFFICULTY));
  // How many D10 a test throws, and what several of them mean. Both start from
  // the context so a trait can one day grant « 2 dés, sommés » without any
  // screen learning the rule; today nothing on the sheet models one, so they are
  // the player's to set. Defaulted ONCE — the field and the opening throw have
  // to agree, and reading `context` twice is how they would stop agreeing.
  const initialDice = context?.dice ?? DEFAULT_DICE;
  const initialMode = context?.diceMode ?? 'keep';
  const [dice, setDice] = useState(String(initialDice));
  const [mode, setMode] = useState<DiceMode>(initialMode);
  // A tap on a value is a request to roll, so a contextual dialog opens with its
  // dice already thrown. Seeded in the initializer rather than in an effect: an
  // effect would render the empty state first and then set state from it.
  const [state, setState] = useState<RollState>(() =>
    context ? { ...EMPTY, roll: throwFor(initialDice, initialMode) } : EMPTY,
  );

  const rollNow = () =>
    setState(
      context
        ? { ...EMPTY, roll: throwFor(Number(dice), mode) }
        : { ...EMPTY, freeform: rollDice(Math.max(1, parseInt(count, 10) || 1), sides) },
    );
  const rollTendance = () => {
    const trio = rollTendances();
    // The trio is a `keep` throw whose dice happen to have colours: same shape,
    // same keptIndex, so nothing downstream needs a tendance special case.
    // The throw carries the tendances themselves: on a cast they decide what a
    // discarded die costs (see lib/roll readDice).
    setState({
      ...EMPTY,
      roll: {
        dice: trio.map((t) => t.value),
        mode: 'keep',
        keptIndex: null,
        tendances: trio.map((t) => t.key),
      },
    });
  };
  /**
   * Keeping a die settles the throw. Every confirmation is dropped: which dice
   * were discarded just changed, and on a cast that is exactly what decides
   * which of them owed a reroll.
   */
  const keep = (index: number) =>
    setState((s) => (s.roll ? { ...s, roll: { ...s.roll, keptIndex: index }, confirms: [] } : s));
  /** Reroll ONE die's confirmation — a cast can owe several, one per die. */
  const confirm = (index: number) =>
    setState((s) => {
      const confirms = [...s.confirms];
      confirms[index] = rollDie(DIE_SIDES);
      return { ...s, confirms };
    });

  // Changing what you are about to roll clears what you rolled: the dice on
  // screen must never belong to a different question than the one on display.
  const pickSides = (s: number) => {
    onSidesChange(s);
    setState(EMPTY);
  };
  const setCountSafe = (t: string) => {
    setCount(t);
    setState(EMPTY);
  };
  const setDiceSafe = (t: string) => {
    // Clamp what is TYPED, not just what is thrown: a field reading « 9 » that
    // rolls MAX_DICE dice is the app lying about what it did. An empty field is
    // left empty so it can be retyped.
    setDice(t === '' ? t : String(diceCount(Number(t))));
    setState(EMPTY);
  };
  const setModeSafe = (m: DiceMode) => {
    setMode(m);
    setState(EMPTY);
  };

  // Read on every render rather than stored: editing the difficulté has to move
  // the verdict WITHOUT touching the dice. resolveRoll returns null on its own
  // while a `keep` throw is still waiting to be picked from.
  const result: RollResult | null =
    context && state.roll != null && difficulty.trim() !== ''
      ? resolveRoll(state.roll, context, Number(difficulty), state.confirms)
      : null;

  return (
    <DsDialog
      visible
      onDismiss={onDismiss}
      title={context ? 'Jet de dés' : 'Lancer les dés'}
      dismiss={<Button onPress={onDismiss}>Fermer</Button>}
      actions={
        <>
          <Button mode="outlined" icon={dsIcon('dragon')} onPress={rollTendance}>
            Tendances
          </Button>
          <Button mode="contained" icon={dsIcon('dice')} onPress={rollNow}>
            Lancer
          </Button>
        </>
      }>
      {context ? (
        <RollContextBody
          context={context}
          dice={dice}
          onDice={setDiceSafe}
          mode={mode}
          onMode={setModeSafe}
          difficulty={difficulty}
          onDifficulty={setDifficulty}
          roll={state.roll}
          tendances={tendanceRolls(state.roll)}
          confirms={state.confirms}
          onKeep={keep}
          onConfirm={confirm}
          result={result}
        />
      ) : (
        <RollFreeformBody
          count={count}
          onCount={setCountSafe}
          sides={sides}
          onPickSides={pickSides}
          result={state.freeform}
          tendances={tendanceRolls(state.roll)}
        />
      )}
    </DsDialog>
  );
}
