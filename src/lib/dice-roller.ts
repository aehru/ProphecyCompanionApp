import type { RollContext } from '@/lib/roll';

/**
 * The app-level dice roller, as a module-level store rather than a React
 * context — the same shape as {@link Alert} in `lib/alert`, and for the same
 * reason.
 *
 * A provider only reaches what sits BELOW it in the tree, and Paper's `Portal`
 * does not: a portal's children render under the `PortalHost` inside
 * `<PaperProvider>`, which is ABOVE everything `_layout` mounts. So the GM
 * sheet's bottom sheet — a `Portal` + `Modal` — threw
 * « useDiceRoller must be used within DiceRollerProvider » the moment an NPC's
 * gear tried to roll, and every DsDialog would have done the same. A store has
 * no tree position, so it works from a portal, a dialog, or a non-component
 * module alike.
 *
 * What is kept between opens: the die size only. There is no roll history — the
 * dialog is mounted only WHILE open ({@link DiceRollerHost}), so its state is
 * recreated on every open. The size is not persisted either: an app restart is
 * back to D10, Prophecy's usual die.
 */

/** Prophecy's die. The picker can move off it for a session, never past a restart. */
const DEFAULT_SIDES = 10;

/** An open roller: the context it was opened against, and the current die size. */
export type RollerRequest = {
  /** What is being tested, or null for the free-form roller (the header button). */
  context: RollContext | null;
  sides: number;
};

// Reference-stable between changes: the host feeds this straight to
// `useSyncExternalStore`, which loops forever on a fresh object per read.
let request: RollerRequest | null = null;
let sides = DEFAULT_SIDES;
const subscribers = new Set<() => void>();

function emit() {
  for (const notify of subscribers) notify();
}

/** Subscribe to roller changes; returns the unsubscribe. For `useSyncExternalStore`. */
export function subscribeRoller(onChange: () => void) {
  subscribers.add(onChange);
  return () => {
    subscribers.delete(onChange);
  };
}

/** The open roller, or null. */
export function currentRoller(): RollerRequest | null {
  return request;
}

/**
 * Open the roller. Reopening it resets the count and clears the last result.
 * With a `context`, the roller opens against it and rolls a D10 immediately —
 * a tap on a value is a request to roll, not to fill a form. The context is not
 * kept: reopening from a header is always contextless, unlike the die size.
 */
export function openRoller(context?: RollContext) {
  request = { context: context ?? null, sides };
  emit();
}

/** Pick the die size. Held for the session, whether or not the roller is open. */
export function setRollerSides(next: number) {
  sides = next;
  if (request) request = { ...request, sides };
  emit();
}

export function dismissRoller() {
  if (request === null) return;
  request = null;
  emit();
}

/** Test-only: close the roller and forget the picked die. */
export function resetRoller() {
  request = null;
  sides = DEFAULT_SIDES;
  emit();
}
