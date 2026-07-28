import React, { useRef, useState } from 'react';
import { Alert, type TextInput as RNTextInput, StyleSheet, View } from 'react-native';
import { Button, TextInput } from 'react-native-paper';

import NumberField from '@/components/number-field';
import ChipSelect from '@/components/ui/chip-select';
import { ARMOR_CATEGORIES, type ArmorCategory } from '@/data/armor-catalog';
import type { Armor } from '@/db/schema';
import { useDebouncedText } from '@/hooks/use-debounced-text';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';
import { formatDecimal, parseDecimal } from '@/lib/character-values';
import { deleteArmor, updateArmor } from '@/repositories/armor';

// Split out of armor-card.tsx: the read-only card and this editor form share
// nothing but the Armor type, and only the `armor/[aid]` modal loads this one.

const CATEGORY_OPTIONS = ARMOR_CATEGORIES.map((c) => ({ key: c, label: c }));

// Field tab order for the keyboard "next" chaining. The multiline "special"
// field is intentionally excluded (it's the trailing free-text box).
const EDIT_ORDER = ['name', 'prereq', 'defenseMax', 'creationDifficulty', 'creationTime', 'encombrement'] as const;

/**
 * Armor editor form, rendered in the `armor/[aid]` modal screen. Edits persist
 * live (debounced) like the weapon editor; `onClose` returns after a delete.
 */
export default function ArmorEditor({ armor: a, onClose }: { armor: Armor; onClose: () => void }) {
  const theme = useProphecyTheme();
  const [name, setName] = useDebouncedText(a.name, (t) => updateArmor(a.id, { name: t }));
  const [prereq, setPrereq] = useDebouncedText(a.prerequisites, (t) =>
    updateArmor(a.id, { prerequisites: t }),
  );
  const [special, setSpecial] = useDebouncedText(a.special, (t) => updateArmor(a.id, { special: t }));
  // Creation time is the one fractional field (0,5 jour) — see WeaponEditor's
  // note on why it's kept local instead of read back off the row.
  const [creationTime, setCreationTime] = useState(a.creationTime ? formatDecimal(a.creationTime) : '');

  const confirmDelete = () =>
    Alert.alert('Supprimer', 'Supprimer cette armure ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          await deleteArmor(a.id);
          onClose();
        },
      },
    ]);

  // Keyboard "next" wiring: jump to the following field instead of dismissing.
  const refs = useRef<Record<string, RNTextInput | null>>({});
  const focusNext = (key: string) => {
    const next = EDIT_ORDER[EDIT_ORDER.indexOf(key as (typeof EDIT_ORDER)[number]) + 1];
    refs.current[next]?.focus();
  };
  const setPaperRef = (key: string) => (el: unknown) => {
    refs.current[key] = el as RNTextInput | null;
  };
  const textChain = (key: string) => ({
    ref: setPaperRef(key),
    returnKeyType: 'next' as const,
    blurOnSubmit: false,
    onSubmitEditing: () => focusNext(key),
  });
  const numChain = (key: string, last = false) => ({
    inputRef: (el: RNTextInput | null) => {
      refs.current[key] = el;
    },
    returnKeyType: (last ? 'done' : 'next') as 'done' | 'next',
    submitBehavior: (last ? 'blurAndSubmit' : 'submit') as 'blurAndSubmit' | 'submit',
    onSubmitEditing: () => focusNext(key),
  });

  return (
    <>
      <TextInput
        label="Nom"
        value={name}
        onChangeText={setName}
        mode="outlined"
        dense
        {...textChain('name')}
      />

      <ChipSelect
        label="Catégorie"
        options={CATEGORY_OPTIONS}
        value={a.category}
        onChange={(k) => updateArmor(a.id, { category: k as ArmorCategory })}
      />

      <TextInput
        label="Prérequis (ex. FOR 4, COO 5)"
        value={prereq}
        onChangeText={setPrereq}
        mode="outlined"
        dense
        autoCapitalize="characters"
        {...textChain('prereq')}
      />

      <View style={styles.grid}>
        <NumberField
          fieldKey="defenseMax"
          label="Défense max"
          value={a.defenseMax ? String(a.defenseMax) : ''}
          onChange={(_, t) => {
            const max = Number(t) || 0;
            // An undamaged armor (current at its max) stays full as the max
            // changes; a damaged one clamps to the new ceiling.
            const full = a.defenseCurrent >= a.defenseMax;
            updateArmor(a.id, {
              defenseMax: max,
              defenseCurrent: full ? max : Math.min(a.defenseCurrent, max),
            });
          }}
          style={styles.numCol}
          {...numChain('defenseMax')}
        />
        <NumberField
          fieldKey="creationDifficulty"
          label="Difficulté création"
          value={a.creationDifficulty ? String(a.creationDifficulty) : ''}
          onChange={(_, t) => updateArmor(a.id, { creationDifficulty: Number(t) || 0 })}
          style={styles.numCol}
          {...numChain('creationDifficulty')}
        />
        <NumberField
          fieldKey="creationTime"
          label="Temps création"
          value={creationTime}
          onChange={(_, t) => {
            setCreationTime(t);
            updateArmor(a.id, { creationTime: parseDecimal(t) });
          }}
          decimal
          style={styles.numCol}
          {...numChain('creationTime')}
        />
        <NumberField
          fieldKey="encombrement"
          label="Pénalité d'encombrement"
          value={a.encombrementMalus ? String(a.encombrementMalus) : ''}
          onChange={(_, t) => updateArmor(a.id, { encombrementMalus: Number(t) || 0 })}
          style={styles.numCol}
          {...numChain('encombrement', true)}
        />
      </View>

      <TextInput
        label="Spécial (autres effets)"
        value={special}
        onChangeText={setSpecial}
        mode="outlined"
        multiline
        style={styles.special}
      />

      <View style={styles.actions}>
        <Button
          mode="outlined"
          icon="delete"
          textColor={theme.colors.error}
          onPress={confirmDelete}
          style={styles.actionBtn}>
          Supprimer
        </Button>
        <Button
          mode="contained-tonal"
          icon="hammer-wrench"
          onPress={() => updateArmor(a.id, { defenseCurrent: a.defenseMax })}
          style={styles.actionBtn}>
          Réparer
        </Button>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  numCol: { flexGrow: 1, flexBasis: 120, minWidth: 120 },
  special: { minHeight: 72 },
  actions: { flexDirection: 'row', gap: 8 },
  actionBtn: { flex: 1 },
});
