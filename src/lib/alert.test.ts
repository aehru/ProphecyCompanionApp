import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  Alert,
  type AlertButton,
  currentAlert,
  dismissAlert,
  resetAlerts,
  splitAlertButtons,
  subscribeAlerts,
} from './alert';

beforeEach(() => resetAlerts());

describe('the alert queue', () => {
  it('shows nothing until one is raised', () => {
    expect(currentAlert()).toBeNull();
  });

  it('fills in react-native’s implicit OK button', () => {
    Alert.alert('Copié', '12 caractères copiés.');
    expect(currentAlert()).toEqual({
      title: 'Copié',
      message: '12 caractères copiés.',
      buttons: [{ text: 'OK' }],
    });
  });

  it('queues rather than replaces — an onPress routinely raises the next one', () => {
    Alert.alert('Supprimer');
    Alert.alert('Suppression impossible');
    expect(currentAlert()?.title).toBe('Supprimer');
    dismissAlert();
    expect(currentAlert()?.title).toBe('Suppression impossible');
    dismissAlert();
    expect(currentAlert()).toBeNull();
  });

  it('dismissing an empty queue is a no-op', () => {
    expect(() => dismissAlert()).not.toThrow();
    expect(currentAlert()).toBeNull();
  });

  // useSyncExternalStore re-renders forever if the snapshot is a fresh object
  // each call, so this is a render-loop guard, not a style preference.
  it('returns a reference-stable snapshot between changes', () => {
    Alert.alert('Erreur');
    expect(currentAlert()).toBe(currentAlert());
  });

  it('notifies subscribers on raise and on dismiss, and stops after unsubscribe', () => {
    const seen = vi.fn();
    const unsubscribe = subscribeAlerts(seen);
    Alert.alert('Erreur');
    dismissAlert();
    expect(seen).toHaveBeenCalledTimes(2);
    unsubscribe();
    Alert.alert('Erreur');
    expect(seen).toHaveBeenCalledTimes(2);
  });
});

describe('splitAlertButtons', () => {
  it('puts the cancel on the left and everything else on the right', () => {
    const cancel: AlertButton = { text: 'Annuler', style: 'cancel' };
    const confirm: AlertButton = { text: 'Supprimer', style: 'destructive' };
    expect(splitAlertButtons([cancel, confirm])).toEqual({ cancel, actions: [confirm] });
  });

  // « Copié », « Import réussi »: an acknowledgement is not a way out, so it
  // belongs on the right with the other real actions.
  it('treats a lone OK as an action, not a dismiss', () => {
    const ok: AlertButton = { text: 'OK' };
    expect(splitAlertButtons([ok])).toEqual({ cancel: null, actions: [ok] });
  });

  it('takes only the first cancel, whatever the order', () => {
    const first: AlertButton = { text: 'Annuler', style: 'cancel' };
    const second: AlertButton = { text: 'Plus tard', style: 'cancel' };
    const { cancel, actions } = splitAlertButtons([{ text: 'Effacer' }, first, second]);
    expect(cancel).toBe(first);
    expect(actions).toEqual([{ text: 'Effacer' }, second]);
  });
});
