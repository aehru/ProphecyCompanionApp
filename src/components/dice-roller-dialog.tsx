import { useState } from 'react';
import { Button } from 'react-native-paper';

import RollContextBody from '@/components/roll-context-body';
import RollFreeformBody from '@/components/roll-freeform-body';
import DsDialog from '@/components/ui/ds-dialog';
import { dsIcon } from '@/components/ui/icon';
import type { TendanceKey } from '@/constants/prophecy';
import { rollDice, rollDie, rollTendances, type TendanceRoll } from '@/lib/dice';
import {
  DEFAULT_DIFFICULTY,
  DIE_SIDES,
  resolveRoll,
  type RollContext,
  type RollResult,
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
  /** The die the reading rests on — null while a trio is waiting to be kept. */
  die: number | null;
  confirmDie: number | null;
  /** Which tendance was kept, for the row's selected ring. */
  kept: TendanceKey | null;
  tendances: TendanceRoll[] | null;
  /** The free-form XdY throw; never set in context (a test is one D10). */
  freeform: number[] | null;
}

const EMPTY: RollState = {
  die: null,
  confirmDie: null,
  kept: null,
  tendances: null,
  freeform: null,
};

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
  const [difficulty, setDifficulty] = useState(String(DEFAULT_DIFFICULTY));
  // A tap on a value is a request to roll, so a contextual dialog opens with its
  // die already rolled. Seeded in the initializer rather than in an effect: an
  // effect would render the empty state first and then set state from it.
  const [roll, setRoll] = useState<RollState>(() =>
    context ? { ...EMPTY, die: rollDie(DIE_SIDES) } : EMPTY,
  );

  const rollNow = () =>
    setRoll(
      context
        ? { ...EMPTY, die: rollDie(DIE_SIDES) }
        : { ...EMPTY, freeform: rollDice(Math.max(1, parseInt(count, 10) || 1), sides) },
    );
  const rollTendance = () => setRoll({ ...EMPTY, tendances: rollTendances() });
  /** Keeping a tendance die makes it THE die; the other two are discarded. */
  const keepTendance = (r: TendanceRoll) =>
    setRoll((s) => ({ ...s, kept: r.key, die: r.value, confirmDie: null }));
  const confirm = () => setRoll((s) => ({ ...s, confirmDie: rollDie(DIE_SIDES) }));

  // Changing what you are about to roll clears what you rolled: the dice on
  // screen must never belong to a different question than the one on display.
  const pickSides = (s: number) => {
    onSidesChange(s);
    setRoll(EMPTY);
  };
  const setCountSafe = (t: string) => {
    setCount(t);
    setRoll(EMPTY);
  };

  // Read on every render rather than stored: editing the difficulté has to move
  // the verdict WITHOUT touching the dice.
  const result: RollResult | null =
    context && roll.die != null && difficulty.trim() !== ''
      ? resolveRoll(roll.die, context, Number(difficulty), roll.confirmDie)
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
          difficulty={difficulty}
          onDifficulty={setDifficulty}
          die={roll.die}
          confirmDie={roll.confirmDie}
          tendances={roll.tendances}
          selectedKey={roll.kept}
          onSelectTendance={keepTendance}
          onConfirm={confirm}
          result={result}
        />
      ) : (
        <RollFreeformBody
          count={count}
          onCount={setCountSafe}
          sides={sides}
          onPickSides={pickSides}
          result={roll.freeform}
          tendances={roll.tendances}
        />
      )}
    </DsDialog>
  );
}
