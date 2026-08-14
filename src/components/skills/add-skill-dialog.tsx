// Adds a free (custom) skill from an explicit dialog. The search bar's
// "Ajouter « X »" shortcut still works, but it only appears once you have typed
// something that matches nothing — this is the discoverable path.

import React, { useState } from 'react';
import { Button, HelperText, TextInput } from 'react-native-paper';

import ChipSelect from '@/components/ui/chip-select';
import DsDialog from '@/components/ui/ds-dialog';
import { dsIcon } from '@/components/ui/icon';
import { ATTRIBUTS } from '@/constants/prophecy';

export default function AddSkillDialog({
  visible,
  onDismiss,
  onAdd,
  defaultName = '',
  defaultAttribut,
  existingNames,
}: {
  visible: boolean;
  onDismiss: () => void;
  onAdd: (name: string, attribut: string) => void;
  /** Prefilled name — the search's « Ajouter « X » » hands over its query. */
  defaultName?: string;
  /** The tab the user is on — the new skill lands where they are working. */
  defaultAttribut: string;
  /** Lower-cased names already in the editor, to refuse a duplicate. */
  existingNames: Set<string>;
}) {
  const [name, setName] = useState(defaultName);
  const [attribut, setAttribut] = useState(defaultAttribut);

  // Every opening re-seeds from the props: blank from the FAB, the query from
  // the search's add button, and the attribut from the active tab. Adjusted
  // during render (React's "derive state from props") rather than in an effect,
  // so the first frame of the dialog is already the seeded one.
  const [wasVisible, setWasVisible] = useState(visible);
  if (visible !== wasVisible) {
    setWasVisible(visible);
    if (visible) {
      setName(defaultName);
      setAttribut(defaultAttribut);
    }
  }

  const trimmed = name.trim();
  const duplicate = existingNames.has(trimmed.toLowerCase());
  const canAdd = trimmed !== '' && !duplicate;

  const submit = () => {
    if (!canAdd) return;
    onAdd(trimmed, attribut);
    onDismiss();
  };

  return (
    <DsDialog
      visible={visible}
      onDismiss={onDismiss}
      title="Nouvelle compétence"
      actions={
        <>
          <Button onPress={onDismiss}>Annuler</Button>
          <Button mode="contained" icon={dsIcon('plus')} disabled={!canAdd} onPress={submit}>
            Ajouter
          </Button>
        </>
      }>
      <TextInput
        label="Nom"
        value={name}
        onChangeText={setName}
        autoFocus
        error={duplicate}
        returnKeyType="done"
        onSubmitEditing={submit}
      />
      {duplicate ? (
        <HelperText type="error" visible>
          Cette compétence existe déjà.
        </HelperText>
      ) : null}

      <ChipSelect label="Attribut" options={ATTRIBUTS} value={attribut} onChange={setAttribut} />
    </DsDialog>
  );
}
