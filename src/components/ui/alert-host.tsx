import React, { useSyncExternalStore } from 'react';
import { StyleSheet } from 'react-native';
import { Button, Text } from 'react-native-paper';

import DsDialog from '@/components/ui/ds-dialog';
import { dsIcon } from '@/components/ui/icon';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';
import {
  type AlertButton,
  currentAlert,
  DEFAULT_ACTION_ICON,
  dismissAlert,
  splitAlertButtons,
  subscribeAlerts,
} from '@/lib/alert';

/**
 * Renders whatever `Alert.alert` (from `@/lib/alert`) queued — see that module
 * for why the app draws its own alerts instead of the platform's.
 *
 * Mounted once, directly under `<PaperProvider>` in `_layout`: high enough that
 * an alert raised from the database failure screen still shows, and Paper's
 * `Portal` hoists the surface to the provider's portal host anyway. Because a
 * portal is appended to that host when it mounts, and this one only mounts when
 * an alert fires, it lands ON TOP of a dialog or bottom-sheet already open —
 * which is what makes « Supprimer cette arme » work from inside the GM sheet.
 *
 * The one place that still wins over it is `qr-scanner.tsx`, which uses
 * react-native's `Modal` (a real native window, not a portal). Nothing raises an
 * alert while the scanner is up; if something ever does, close the scanner first.
 */
export default function AlertHost() {
  const request = useSyncExternalStore(subscribeAlerts, currentAlert, currentAlert);
  const theme = useProphecyTheme();

  if (!request) return null;
  const { cancel, actions } = splitAlertButtons(request.buttons);

  // Dismiss BEFORE running the handler: an `onPress` that raises the next alert
  // (delete → « Suppression impossible ») must find this one already gone, or it
  // would queue behind a dialog nobody can close.
  const press = (button: AlertButton) => () => {
    dismissAlert();
    button.onPress?.();
  };

  const renderAction = (button: AlertButton, index: number) => {
    const destructive = button.style === 'destructive';
    const icon = button.icon === null ? undefined : dsIcon(button.icon ?? DEFAULT_ACTION_ICON);
    return (
      <Button
        key={index}
        // Stable across alerts so a test can reach the confirm button without
        // knowing its French label.
        //
        // TRAP: this names the button by its ROLE, not its position, so two
        // non-destructive actions in one alert would both answer to
        // `alert-confirm` — and Playwright's strict mode fails on a selector
        // that resolves twice. No call site does that today (every alert is one
        // action, or one action plus a cancel), and a destructive one is named
        // apart. Adding a two-action alert means giving them distinct ids here.
        testID={destructive ? 'alert-destructive' : 'alert-confirm'}
        mode="contained"
        icon={icon}
        buttonColor={destructive ? theme.colors.error : undefined}
        textColor={destructive ? theme.colors.onError : undefined}
        onPress={press(button)}>
        {button.text ?? 'OK'}
      </Button>
    );
  };

  return (
    <DsDialog
      visible
      // Backdrop / Android back = the cancel button, when the alert offers one.
      // With no way out on offer, the alert is an acknowledgement and dismissing
      // it IS the acknowledgement.
      onDismiss={press(cancel ?? {})}
      title={request.title}
      dismiss={
        cancel ? (
          <Button testID="alert-cancel" onPress={press(cancel)}>
            {cancel.text ?? 'Annuler'}
          </Button>
        ) : undefined
      }
      actions={actions.map(renderAction)}>
      {request.message ? (
        <Text variant="bodyMedium" style={styles.message}>
          {request.message}
        </Text>
      ) : null}
    </DsDialog>
  );
}

const styles = StyleSheet.create({
  // The messages are full sentences, several of them multi-line — bodyMedium's
  // own line height packs those too tight to scan at a glance.
  message: { lineHeight: 22 },
});
