import React from 'react';
import { Platform, ScrollView, StyleSheet, useWindowDimensions } from 'react-native';
import { useKeyboardState } from 'react-native-keyboard-controller';
import { Dialog, Portal } from 'react-native-paper';

import { dialogWidth } from '@/hooks/use-layout';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';

/**
 * The DS dialog surface: tighter radius + a 1px gold hairline (Paper's default
 * corner balloons and has no border), a capped width, and a body that scrolls
 * and stays clear of the keyboard.
 *
 * That last part is the whole reason this component exists. Paper's `Modal` is
 * an `absoluteFill` that centers its child and does nothing about the keyboard,
 * and its `Dialog` has neither a max height nor a scrollable body — so on a
 * phone in landscape (~390dp tall, most of it keyboard) the fields and the
 * actions row sit under the keyboard with no way to reach them.
 *
 * Capping the height is NOT enough on its own: a shorter dialog is still
 * centred in the full-screen wrapper, so it keeps overlapping the keyboard.
 * The fix is both halves together —
 *
 *   `maxHeight`     h ≤ H − K − MARGIN
 *   `marginBottom`  K, which in a centred flex box drops the visible bottom
 *                   edge to (H + h − K) / 2, and h ≤ H − K makes that ≤ H − K
 *
 * — i.e. the cap is what makes the shift sufficient. Overflow then scrolls
 * inside the cap rather than disappearing.
 */
// Breathing room around the dialog, and a floor so it never collapses to a sliver.
const MARGIN = 48;
const MIN_HEIGHT = 180;
// Paper adds this on Android so the shadow isn't clipped; setting marginBottom
// would drop it, and an asymmetric pair would shift the dialog off-centre.
const SHADOW_MARGIN = Platform.OS === 'android' ? 44 : 0;

export default function DsDialog({
  visible,
  onDismiss,
  title,
  actions,
  children,
}: {
  visible: boolean;
  onDismiss: () => void;
  title?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  const theme = useProphecyTheme();
  const { height } = useWindowDimensions();
  const keyboardHeight = useKeyboardState((s) => s.height);
  const maxHeight = Math.max(height - keyboardHeight - MARGIN - SHADOW_MARGIN * 2, MIN_HEIGHT);

  // Paper's Dialog.Actions clones every child to inject `compact`/`uppercase`,
  // and cloning a Fragment with those throws. Unwrap one level so callers can
  // still group their buttons in a <>…</>.
  const actionButtons =
    React.isValidElement(actions) && actions.type === React.Fragment
      ? (actions.props as { children?: React.ReactNode }).children
      : actions;

  return (
    <Portal>
      <Dialog
        visible={visible}
        onDismiss={onDismiss}
        style={[
          styles.dialog,
          dialogWidth,
          {
            maxHeight,
            marginTop: SHADOW_MARGIN,
            marginBottom: keyboardHeight + SHADOW_MARGIN,
            borderColor: theme.prophecy.border,
          },
        ]}>
        {title ? <Dialog.Title>{title}</Dialog.Title> : null}
        <Dialog.ScrollArea style={styles.scrollArea}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
        </Dialog.ScrollArea>
        {actions ? <Dialog.Actions>{actionButtons}</Dialog.Actions> : null}
      </Dialog>
    </Portal>
  );
}

const styles = StyleSheet.create({
  dialog: { borderRadius: 18, borderWidth: 1 },
  // ScrollArea ships 24dp side padding and a hairline top/bottom rule. Move the
  // padding onto the content (so the scrollbar sits at the edge) and drop the
  // rules — the DS dialog is flat.
  scrollArea: { paddingHorizontal: 0, borderTopWidth: 0, borderBottomWidth: 0 },
  // Matches what Dialog.Content gave us: 24 side padding, 16 between fields.
  content: { paddingHorizontal: 24, paddingBottom: 8, gap: 16 },
});
