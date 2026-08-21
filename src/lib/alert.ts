import type { IconName } from '@/components/ui/icon';

/**
 * A drop-in replacement for react-native's `Alert`, rendered by the app itself.
 *
 * react-native-web ships `class Alert { static alert() {} }` — a literal no-op.
 * On the web build that means every destructive confirm never appears (so its
 * `onPress` never runs and the button reads as dead) and every `Alert.alert(
 * 'Erreur', …)` swallows its message. Guarding 26 call sites with `Platform.OS`
 * would leave one branch per platform that the other platform's developer never
 * exercises — which is exactly how the web half rotted unnoticed. So there is
 * ONE path: the alert renders as a {@link DsDialog} everywhere.
 *
 * What that trades away, deliberately:
 * - iOS's free `style: 'destructive'` red — re-applied here as `colors.error`.
 * - The OS alert's focus trap and VoiceOver/TalkBack announcement. Paper's
 *   `Portal` + `Dialog` set the roles but are not equal to a native alert.
 *
 * What it buys, besides working on web: the same button placement on every
 * platform (iOS puts Cancel left, Android right; the DS row is always
 * dismiss-left / action-right) and a body that is a React tree rather than a
 * string — which is how the delete-character warning stops being a `\n\n`
 * glued onto a sentence.
 *
 * This module is pure and framework-free on purpose: it holds the queue and
 * the button-splitting rule so both are unit-testable in plain Node, and so an
 * alert can be raised from a non-component module ({@link pickCharacterMedia}
 * in `lib/media.ts` is not a hook and cannot reach a provider). The rendering
 * half lives in `components/ui/alert-host.tsx`.
 */

export type AlertButtonStyle = 'default' | 'cancel' | 'destructive';

export type AlertButton = {
  text?: string;
  style?: AlertButtonStyle;
  onPress?: () => void;
  /**
   * Ours, not react-native's: the DS asks a primary action to carry an icon.
   * Absent means {@link DEFAULT_ACTION_ICON}; `null` means none at all.
   */
  icon?: IconName | null;
};

export type AlertRequest = {
  title: string;
  message?: string;
  buttons: AlertButton[];
};

export const DEFAULT_ACTION_ICON: IconName = 'check';

/**
 * What react-native shows when `buttons` is omitted. Built fresh per call, not
 * shared: a single module-level array would put the same object on every
 * button-less alert ever raised, so one consumer mutating it would reach all of
 * them.
 */
const defaultButtons = (): AlertButton[] => [{ text: 'OK' }];

// A queue, not a single slot: `Alert.alert` is fire-and-forget, and a button's
// `onPress` routinely raises the next one (delete → « Suppression impossible »).
// react-native queues those; dropping them would lose the error message.
const queue: AlertRequest[] = [];
const subscribers = new Set<() => void>();

function emit() {
  for (const notify of subscribers) notify();
}

/** Subscribe to queue changes; returns the unsubscribe. For `useSyncExternalStore`. */
export function subscribeAlerts(onChange: () => void) {
  subscribers.add(onChange);
  return () => {
    subscribers.delete(onChange);
  };
}

/**
 * The alert to show, or null. Reference-stable between changes — the host feeds
 * it straight to `useSyncExternalStore`, which loops forever on a fresh object.
 */
export function currentAlert(): AlertRequest | null {
  return queue[0] ?? null;
}

/** Drop the visible alert and reveal the next queued one. */
export function dismissAlert() {
  if (queue.length === 0) return;
  queue.shift();
  emit();
}

/** Test-only: empty the queue so one case can't leak into the next. */
export function resetAlerts() {
  queue.length = 0;
  emit();
}

/**
 * `react-native`'s `Alert`, same signature, ours. Swapping the import is the
 * whole of a call-site migration.
 */
export const Alert = {
  alert(title: string, message?: string, buttons?: AlertButton[]) {
    queue.push({
      title,
      message,
      buttons: buttons?.length ? buttons : defaultButtons(),
    });
    emit();
  },
};

/**
 * Split a button list into the DsDialog's two slots: the way out on the left,
 * what the dialog is FOR on the right.
 *
 * A lone button is an acknowledgement (« Copié », « Import réussi ») and belongs
 * on the RIGHT even when it reads « OK » — the left slot is for backing out of a
 * choice, and there is no choice here.
 */
export function splitAlertButtons(buttons: AlertButton[]): {
  cancel: AlertButton | null;
  actions: AlertButton[];
} {
  const cancel = buttons.find((b) => b.style === 'cancel') ?? null;
  return { cancel, actions: buttons.filter((b) => b !== cancel) };
}
