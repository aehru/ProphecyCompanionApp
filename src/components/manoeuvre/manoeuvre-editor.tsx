import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, HelperText, TextInput } from 'react-native-paper';

import ChipSelect from '@/components/ui/chip-select';
import { dsIcon } from '@/components/ui/icon';
import SectionCard from '@/components/ui/section-card';
import { MANOEUVRE_CONTEXTS, MANOEUVRE_FAMILIES } from '@/constants/prophecy';
import type { CustomManoeuvre, NewCustomManoeuvre } from '@/db/schema';
import { useDebouncedText } from '@/hooks/use-debounced-text';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';
import { Alert } from '@/lib/alert';
import { ratingWarning } from '@/lib/manoeuvre';
import { deleteCustomManoeuvre, updateCustomManoeuvre } from '@/repositories/custom-manoeuvres';
import { detachWrite } from '@/repositories/log';

type TextKey = 'name' | 'difficulty' | 'dodge' | 'parry' | 'damage' | 'roll' | 'inGameEffect' | 'description';

/**
 * The « Maison » manœuvre form, laid out like `TraitEditor`: every field writes
 * through (debounced), « Terminer » leaves, « Supprimer » confirms.
 *
 * Nothing BLOCKS. Nom and description are what makes an entry readable, so an
 * empty one says so; a Difficulté / Esquive / Parade cell the rulebook grammar
 * cannot read gets the same message the CSV build would print, and is kept as
 * typed — a table's « très dure » is a legitimate ruling.
 */
export default function ManoeuvreEditor({
  manoeuvre: m,
  onClose,
}: {
  manoeuvre: CustomManoeuvre;
  /** Done, or deleted — both leave the screen. */
  onClose: () => void;
}) {
  const theme = useProphecyTheme();
  const patch = (data: Partial<NewCustomManoeuvre>) =>
    detachWrite('custom_manoeuvres', updateCustomManoeuvre(m.id, data), { catalogId: m.id });

  const confirmDelete = () =>
    Alert.alert(
      'Supprimer',
      `Supprimer « ${m.name || 'cette manœuvre'} » ? Les personnages qui l'avaient en favori la perdront.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () =>
            detachWrite('custom_manoeuvres', deleteCustomManoeuvre(m.id).then(onClose), {
              catalogId: m.id,
            }),
        },
      ],
    );

  return (
    <>
      <Field row={m} field="name" label="Nom" patch={patch} required />
      <Field row={m} field="difficulty" label="Difficulté" placeholder="20, 15 + X, opposition…" patch={patch} rating />
      <Field row={m} field="dodge" label="Esquive" placeholder="normale, facile (10), impossible…" patch={patch} rating />
      <Field row={m} field="parry" label="Parade" placeholder="normale, selon l'arme…" patch={patch} rating />
      <Field row={m} field="damage" label="Dommages" placeholder="normaux, la Force s'ajoute…" patch={patch} />
      <Field row={m} field="roll" label="Jet" placeholder="Physique + Corps à corps contre…" patch={patch} />
      <Field row={m} field="inGameEffect" label="Effet en jeu" patch={patch} multiline />
      <Field row={m} field="description" label="Description" patch={patch} multiline required />

      {/* Where it is filed, not what it says: folded, since the defaults
          (Mêlée, Manœuvres) are what most house entries keep. */}
      <SectionCard title="Classement" collapsible defaultExpanded={false}>
        <ChipSelect
          label="Contexte"
          options={MANOEUVRE_CONTEXTS}
          value={m.context}
          onChange={(key) => patch({ context: key as CustomManoeuvre['context'] })}
        />
        <ChipSelect
          label="Rubrique"
          options={MANOEUVRE_FAMILIES}
          value={m.family}
          onChange={(key) => patch({ family: key as CustomManoeuvre['family'] })}
        />
      </SectionCard>

      <View style={styles.actions}>
        <Button
          mode="outlined"
          icon="delete"
          textColor={theme.colors.error}
          onPress={confirmDelete}
          style={styles.actionBtn}>
          Supprimer
        </Button>
        <Button mode="contained" icon={dsIcon('check')} onPress={onClose} style={styles.actionBtn}>
          Terminer
        </Button>
      </View>
    </>
  );
}

/** One text column, debounced, with the warning it earns. */
function Field({
  row,
  field,
  label,
  placeholder,
  patch,
  multiline = false,
  required = false,
  rating = false,
}: {
  row: CustomManoeuvre;
  field: TextKey;
  label: string;
  placeholder?: string;
  patch: (data: Partial<NewCustomManoeuvre>) => void;
  multiline?: boolean;
  required?: boolean;
  /** Read through the rulebook grammar, and warned about when it cannot be. */
  rating?: boolean;
}) {
  const [value, setValue] = useDebouncedText(row[field], (v) => patch({ [field]: v }));
  const warning = required && value.trim() === '' ? `${label} : requis` : rating ? ratingWarning(value) : null;
  return (
    <View>
      <TextInput
        label={label}
        placeholder={placeholder}
        value={value}
        onChangeText={setValue}
        mode="outlined"
        dense
        multiline={multiline}
      />
      {warning ? <HelperText type="info">{warning}</HelperText> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, marginTop: 8 },
  actionBtn: { flexShrink: 1 },
});
