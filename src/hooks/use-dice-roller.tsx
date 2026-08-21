import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

import DiceRollerDialog from '@/components/dice-roller-dialog';

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
 * Deliberately context-free for now: it rolls XdY and the tendance trio, and
 * knows nothing about the screen it was opened from. Prefilling from a skill
 * total or a weapon's damage formula is on the roadmap.
 */
interface DiceRollerContext {
  /** Open the roller. Reopening it resets the count and clears the last result. */
  open: () => void;
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

  const open = useCallback(() => setVisible(true), []);
  // The value is read by every header button in the tree, so keep it stable —
  // `open` never changes, and the dialog's own state lives below this line.
  const value = useMemo(() => ({ open }), [open]);

  return (
    <Ctx.Provider value={value}>
      {children}
      {visible ? (
        <DiceRollerDialog
          sides={sides}
          onSidesChange={setSides}
          onDismiss={() => setVisible(false)}
        />
      ) : null}
    </Ctx.Provider>
  );
}
