import { useSyncExternalStore } from 'react';

import DiceRollerDialog from '@/components/dice-roller-dialog';
import { currentRoller, dismissRoller, setRollerSides, subscribeRoller } from '@/lib/dice-roller';

/**
 * Renders whatever `openRoller` (from `@/lib/dice-roller`) asked for — see that
 * module for why the roller is a store and not a provider.
 *
 * Mounted once, beside `<AlertHost>` under `<PaperProvider>`: the dialog is a
 * `Portal` anyway, so its surface hoists to the provider's portal host wherever
 * this sits. Mounting only while open is what makes it land ON TOP of the GM's
 * bottom sheet, and what keeps the dialog's state fresh on every open.
 */
export default function DiceRollerHost() {
  const request = useSyncExternalStore(
    subscribeRoller,
    currentRoller,
    currentRoller,
  );
  if (!request) return null;
  return (
    <DiceRollerDialog
      sides={request.sides}
      context={request.context}
      onSidesChange={setRollerSides}
      onDismiss={dismissRoller}
    />
  );
}
