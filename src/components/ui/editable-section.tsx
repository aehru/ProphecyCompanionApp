import React, { useState } from 'react';
import { StyleSheet } from 'react-native';
import { IconButton } from 'react-native-paper';

import SectionCard from '@/components/ui/section-card';

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
  children,
}: {
  title: string;
  children: (editing: boolean) => React.ReactNode;
}) {
  const [editing, setEditing] = useState(false);
  return (
    <SectionCard title={title}>
      <IconButton
        icon={editing ? 'check' : 'pencil'}
        size={18}
        style={styles.editBtn}
        onPress={() => setEditing((e) => !e)}
      />
      {children(editing)}
    </SectionCard>
  );
}

const styles = StyleSheet.create({
  editBtn: { position: 'absolute', top: 0, right: 0, margin: 2, zIndex: 1 },
});
