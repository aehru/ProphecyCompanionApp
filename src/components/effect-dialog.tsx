import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Checkbox, TextInput } from 'react-native-paper';

import NumberField from '@/components/number-field';
import DsDialog from '@/components/ui/ds-dialog';
import { dsIcon } from '@/components/ui/icon';
import SelectField from '@/components/ui/select-field';
import { EFFECT_TARGETS, PERMANENT_UNIT, TIME_UNITS } from '@/constants/prophecy';
import type { Effect, Skill } from '@/db/schema';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';
import { Alert } from '@/lib/alert';
import { effectTargetLabel, skillTarget } from '@/lib/modifiers';
import { createEffect, deleteEffect, updateEffect } from '@/repositories/effects';

/** The fields as the dialog holds them — numbers stay text until it commits. */
type Draft = {
  label: string;
  value: string;
  amount: string;
  permanent: boolean;
  durationUnit: string;
  target: string;
};

/**
 * A new effect's starting point: a +0 on every roll, one round. Nothing here is
 * required — the dialog commits whatever it is given (see `EffectDialog`).
 */
const BLANK: Draft = {
  label: '',
  value: '0',
  amount: '1',
  permanent: false,
  durationUnit: 'round',
  target: 'all',
};

const draftOf = (e: Effect): Draft => ({
  label: e.label,
  value: String(e.value),
  amount: String(e.durationRemaining),
  permanent: e.durationUnit === PERMANENT_UNIT,
  durationUnit: e.durationUnit === PERMANENT_UNIT ? 'round' : e.durationUnit,
  target: e.target,
});

function parseSigned(t: string) {
  const n = parseInt(t, 10);
  return Number.isNaN(n) ? 0 : n;
}

/**
 * Create or edit one temporary bonus/malus, as a dialog rather than a screen.
 *
 * Two things this shape buys. The GM never leaves the table: the effect editor
 * used to be a character-scoped modal ROUTE, so touching an NPC's malus from the
 * Compagnie meant navigating out of the campaign. And **nothing is written until
 * « Enregistrer »** — the old flow inserted a blank row up front and let the
 * editor persist each keystroke onto it, so backing out left a +0 effect behind
 * on the sheet.
 *
 * Editing an existing effect drafts the same way (one write on confirm, Annuler
 * discards) so both modes read identically. Deleting stays in the body, in red,
 * behind the usual confirm — the action slots are the way out and the commit,
 * and a destructive third button next to them is how a thumb deletes by mistake.
 */
export default function EffectDialog({
  visible,
  effect,
  characterId,
  skills,
  onDismiss,
}: {
  visible: boolean;
  /** null = create. An Effect = edit that row. */
  effect: Effect | null;
  characterId: number;
  /** The character's own skills, offered as targets alongside the stats. */
  skills: Skill[];
  onDismiss: () => void;
}) {
  const theme = useProphecyTheme();
  // Keyed remount (see the card) hands every open a fresh draft, so a cancelled
  // edit cannot leak its fields into the next one.
  const [draft, setDraft] = useState<Draft>(effect ? draftOf(effect) : BLANK);
  const set = <K extends keyof Draft>(key: K, v: Draft[K]) =>
    setDraft((d) => ({ ...d, [key]: v }));

  // Stats, then this character's skills. An effect can outlive the skill it
  // points at (renamed, deleted); rather than blank the field, the orphan is
  // kept as its own option so the dialog opens showing what it actually targets.
  const targetOptions = [
    ...EFFECT_TARGETS.map((t) => ({ key: t.key, label: t.label })),
    ...skills.map((s) => ({ key: skillTarget(s.name), label: s.name })),
  ];
  if (!targetOptions.some((o) => o.key === draft.target)) {
    targetOptions.push({ key: draft.target, label: effectTargetLabel(draft.target) });
  }

  const save = async () => {
    const amount = parseSigned(draft.amount);
    const timing = draft.permanent
      ? { durationUnit: PERMANENT_UNIT, durationRemaining: 0 }
      : { durationUnit: draft.durationUnit, durationRemaining: amount };
    const data = {
      label: draft.label,
      value: parseSigned(draft.value),
      target: draft.target,
      ...timing,
      // A permanent effect never expires, and giving a spent one a fresh
      // duration is how it gets renewed — either way it comes back active.
      expired: false,
    };
    if (effect) await updateEffect(effect.id, data);
    else await createEffect(characterId, data);
    onDismiss();
  };

  const confirmDelete = () =>
    Alert.alert('Supprimer', 'Supprimer cet effet ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          if (effect) await deleteEffect(effect.id);
          onDismiss();
        },
      },
    ]);

  return (
    <DsDialog
      visible={visible}
      onDismiss={onDismiss}
      testID="effect-dialog"
      title={effect ? "Modifier l'effet" : 'Nouvel effet'}
      dismiss={<Button onPress={onDismiss}>Annuler</Button>}
      actions={
        <Button mode="contained" icon={dsIcon('check')} onPress={save}>
          Enregistrer
        </Button>
      }>
      <TextInput
        label="Nom (optionnel)"
        value={draft.label}
        onChangeText={(t) => set('label', t)}
      />

      <SelectField
        label="Cible"
        options={targetOptions}
        value={draft.target}
        onChange={(v) => set('target', v)}
        searchable
        testID="effect-target"
      />

      <View style={styles.fieldRow}>
        <NumberField
          fieldKey="value"
          label="Valeur (+/−)"
          value={draft.value}
          onChange={(_, t) => set('value', t)}
          signed
          style={styles.valueField}
        />
        {draft.permanent ? null : (
          <>
            <NumberField
              fieldKey="amount"
              label="Durée"
              value={draft.amount}
              onChange={(_, t) => set('amount', t)}
              style={styles.valueField}
            />
            <SelectField
              label="Unité"
              options={TIME_UNITS}
              value={draft.durationUnit}
              onChange={(v) => set('durationUnit', v)}
            />
          </>
        )}
      </View>

      <Checkbox.Item
        label="Permanent (toujours actif)"
        position="leading"
        status={draft.permanent ? 'checked' : 'unchecked'}
        onPress={() => set('permanent', !draft.permanent)}
        style={styles.checkbox}
      />

      {effect ? (
        <Button
          mode="outlined"
          icon="delete"
          textColor={theme.colors.error}
          onPress={confirmDelete}>
          Supprimer
        </Button>
      ) : null}
    </DsDialog>
  );
}

const styles = StyleSheet.create({
  fieldRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'flex-end' },
  valueField: { flexBasis: 90, flexGrow: 0 },
  checkbox: { paddingHorizontal: 0 },
});
