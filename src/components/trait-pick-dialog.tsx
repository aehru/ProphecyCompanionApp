import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Text, TextInput } from 'react-native-paper';

import ChipSelect from '@/components/ui/chip-select';
import DsDialog from '@/components/ui/ds-dialog';
import { dsIcon } from '@/components/ui/icon';
import type { TraitPreset } from '@/data/trait-catalog';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';

/** What the picker cannot answer on its own, filled in by the player. */
export interface TraitPick {
  cost: number;
  /** Goes to `traits.note`. Empty when the entry asks for nothing. */
  note: string;
}

/**
 * The two questions a catalogue pick can't answer for the player.
 *
 * **The price**, when the rulebook lists several (« Maladie (1/3/5) ») — the
 * sheet stores ONE cost and there is no sane default between « Phobie 1 » and
 * « Phobie 3 ». Chips rather than a number field: the offered values are the
 * whole rule, and typing a 4 where the book stops at 3 is what this avoids.
 *
 * **The précision**, when the entry is a blank the player fills — an « Anomalie »
 * is albinos or borgne, an « Interdit » is a specific one. Only entries carrying
 * a `precisionPrompt` in the catalogue ask, because only those are meaningless
 * without one; it is never required, and it stays editable afterwards from the
 * entry's own editor like any other field.
 *
 * A single-price entry that asks nothing never opens this — the picker adds it
 * straight away.
 */
export default function TraitPickDialog({
  preset,
  onDismiss,
  onConfirm,
}: {
  /** The entry being picked; null closes the dialog. */
  preset: TraitPreset | null;
  onDismiss: () => void;
  onConfirm: (preset: TraitPreset, pick: TraitPick) => void;
}) {
  const theme = useProphecyTheme();
  // Opens on the lowest price: the cheapest tier is the common pick. The caller
  // keys this component by the preset, so each entry mounts its own state — a
  // value left over from the previous entry could easily not fit this one, and
  // resetting it in an effect would be a cascading render.
  const [cost, setCost] = useState<number | null>(preset?.costs[0] ?? null);
  const [note, setNote] = useState('');

  const asksCost = (preset?.costs.length ?? 0) > 1;
  const prompt = preset?.precisionPrompt ?? '';

  return (
    <DsDialog
      visible={preset !== null}
      onDismiss={onDismiss}
      title={preset?.data.name ?? ''}
      dismiss={<Button onPress={onDismiss}>Annuler</Button>}
      actions={
        <Button
          mode="contained"
          icon={dsIcon('plus')}
          disabled={preset === null || cost === null}
          onPress={() => {
            if (preset && cost !== null) onConfirm(preset, { cost, note: note.trim() });
          }}>
          Ajouter
        </Button>
      }>
      <View style={styles.body}>
        {asksCost ? (
          <>
            <Text style={{ color: theme.colors.onSurfaceVariant }}>
              Cette entrée existe à plusieurs niveaux. Choisissez le coût en points.
            </Text>
            <ChipSelect
              label="Coût"
              options={(preset?.costs ?? []).map((c) => ({ key: String(c), label: String(c) }))}
              value={cost === null ? '' : String(cost)}
              onChange={(key) => setCost(Number(key))}
            />
          </>
        ) : null}

        {prompt !== '' ? (
          <TextInput
            label={prompt}
            value={note}
            onChangeText={setNote}
            // Free text, and optional: an entry added now and precised later is
            // a normal way to build a character.
            placeholder="Facultatif, modifiable ensuite"
          />
        ) : null}
      </View>
    </DsDialog>
  );
}

const styles = StyleSheet.create({
  body: { gap: 12 },
});
