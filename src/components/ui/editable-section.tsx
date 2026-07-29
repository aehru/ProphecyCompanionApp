import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { IconButton } from 'react-native-paper';

import { dsIcon } from '@/components/ui/icon';
import SectionCard from '@/components/ui/section-card';
import type { IconName } from '@/components/ui/icon';

/**
 * A SectionCard that flips between a read view and a live-edit view via a
 * pencil/check toggle (top-right). The child render-prop receives the current
 * `editing` flag so one card can render read controls or edit controls.
 *
 * Edits are expected to persist live (auto-save) — there is no explicit save;
 * the check just collapses the card back to its read view to prevent misclicks.
 */
export default function EditableSection({
  title,
  icon,
  action,
  children,
}: {
  title: string;
  icon?: IconName;
  // Optional control pinned to the header, left of the edit toggle (e.g. a roll
  // button). Receives the current `editing` flag.
  action?: (editing: boolean) => React.ReactNode;
  children: (editing: boolean) => React.ReactNode;
}) {
  const [editing, setEditing] = useState(false);
  return (
    <SectionCard title={title} icon={icon}>
      <View style={styles.actions}>
        {action ? action(editing) : null}
        <IconButton
          icon={editing ? dsIcon('check') : dsIcon('edit')}
          size={18}
          style={styles.btn}
          onPress={() => setEditing((e) => !e)}
        />
      </View>
      {children(editing)}
    </SectionCard>
  );
}

const styles = StyleSheet.create({
  // One row pinned top-right: optional action then the edit toggle, same size +
  // zero margin so they line up on a single baseline.
  actions: {
    position: 'absolute',
    top: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 1,
  },
  btn: { margin: 0 },
});
