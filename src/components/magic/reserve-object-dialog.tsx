// Add/edit a reserve object. Short form, so a dialog still fits (the DS one:
// capped height, scrolling body, Annuler + a contained primary).

import React from 'react';
import { StyleSheet } from 'react-native';
import { Button, TextInput } from 'react-native-paper';

import NumberField from '@/components/number-field';
import DsDialog from '@/components/ui/ds-dialog';
import { dsIcon } from '@/components/ui/icon';

/** `id: null` = creating a new object; the fields stay strings until saved. */
export interface ReserveObjectDraft {
  id: number | null;
  nom: string;
  max: string;
}

export default function ReserveObjectDialog({
  draft,
  onChange,
  onDismiss,
  onSave,
}: {
  draft: ReserveObjectDraft | null;
  onChange: (draft: ReserveObjectDraft) => void;
  onDismiss: () => void;
  onSave: () => void;
}) {
  const creating = draft?.id == null;
  return (
    <DsDialog
      visible={draft !== null}
      onDismiss={onDismiss}
      title={creating ? 'Nouvel objet' : 'Modifier l’objet'}
      dismiss={<Button onPress={onDismiss}>Annuler</Button>}
      actions={
        <Button
          mode="contained"
          icon={dsIcon(creating ? 'plus' : 'check')}
          onPress={onSave}
          disabled={!draft?.nom.trim()}>
          {creating ? 'Ajouter' : 'Enregistrer'}
        </Button>
      }>
      <TextInput
        label="Nom de l’objet"
        value={draft?.nom ?? ''}
        onChangeText={(t) => draft && onChange({ ...draft, nom: t })}
      />
      <NumberField
        fieldKey="max"
        label="Puces de magie"
        value={draft?.max ?? ''}
        onChange={(_, t) => draft && onChange({ ...draft, max: t })}
        style={styles.maxField}
      />
    </DsDialog>
  );
}

const styles = StyleSheet.create({
  maxField: { flexGrow: 0, flexBasis: 110 },
});
