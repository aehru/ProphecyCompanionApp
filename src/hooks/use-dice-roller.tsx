import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

import DiceRollerDialog from '@/components/dice-roller-dialog';
import type { RollContext } from '@/lib/roll';

/**
 * App-level dice roller. The roller used to be a FAB on the character's Accueil
 * tab only — reaching it from any other screen meant two taps back and two taps
 * out again. It now lives ABOVE navigation, mounted once in `_layout`, and every
 * header carries the button that opens it (`<DiceRollerButton>`).
 *
 * The dialog is mounted only WHILE open, like `<AlertHost>`: its state is
 * therefore recreated on every open (blank count, no result — there is no roll
 * history), and its Portal is appended on top of whatever dialog or bottom sheet
 * is already up. The die size is the one thing the provider keeps, so picking
 * D20 once holds for the session (it is not persisted — an app restart is back
 * to D10, Prophecy's usual die).
 *
 * `open()` takes an optional {@link RollContext}: tapping a skill's TOT opens the
 * roller AGAINST that skill and rolls a D10 at once, while the header button
 * passes nothing and gets the free-form roller it always was. The context is not
 * kept — reopening from a header is always contextless, like the results, and
 * unlike the die size.
 */
interface DiceRollerContext {
  /**
   * Open the roller. Reopening it resets the count and clears the last result.
   * With a `context`, the roller opens against it and rolls a D10 immediately —
   * a tap on a value is a request to roll, not to fill a form.
   */
  open: (context?: RollContext) => void;
}

const Ctx = createContext<DiceRollerContext | null>(null);

export function useDiceRoller(): DiceRollerContext {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useDiceRoller must be used within DiceRollerProvider');
  return ctx;
}

export function DiceRollerProvider({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);
  const [sides, setSides] = useState(10);
  const [context, setContext] = useState<RollContext | null>(null);

  const open = useCallback((ctx?: RollContext) => {
    setContext(ctx ?? null);
    setVisible(true);
  }, []);
  // The value is read by every header button in the tree, so keep it stable —
  // `open` never changes, and the dialog's own state lives below this line.
  const value = useMemo(() => ({ open }), [open]);

  return (
    <Ctx.Provider value={value}>
      {children}
      {visible ? (
        <DiceRollerDialog
          sides={sides}
          context={context}
          onSidesChange={setSides}
          onDismiss={() => setVisible(false)}
        />
      ) : null}
    </Ctx.Provider>
  );
}
