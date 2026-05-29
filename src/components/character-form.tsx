import React, { useCallback, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { Button, FAB, Snackbar, Text, TextInput } from 'react-native-paper';

import NumberField from '@/components/number-field';
import {
  ATTRIBUTS,
  CARACTERISTIQUES,
  RESOURCES,
  TENDANCES,
  WOUND_LEVELS,
} from '@/constants/prophecy';
import type { Character, NewCharacter } from '@/db/schema';
import { type FormValues, fromFormValues, toFormValues } from '@/lib/character-values';

export default function CharacterForm({
  initial,
  submitLabel,
  onSubmit,
  onDelete,
}: {
  initial?: Partial<Character> | null;
  submitLabel: string;
  onSubmit: (data: Partial<NewCharacter>) => Promise<void> | void;
  onDelete?: () => Promise<void> | void;
}) {
  const [v, setV] = useState<FormValues>(() => toFormValues(initial));
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const set = (k: string) => (t: string) => setV((prev) => ({ ...prev, [k]: t }));
  // Stable setter so memoized NumberFields don't all re-render on each keystroke.
  const setField = useCallback((k: string, t: string) => setV((prev) => ({ ...prev, [k]: t })), []);

  async function save() {
    setBusy(true);
    try {
      await onSubmit(fromFormValues(v));
      setSaved(true);
    } finally {
      setBusy(false);
    }
  }

  function confirmDelete() {
    if (!onDelete) return;
    Alert.alert('Supprimer', 'Supprimer ce personnage ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: () => onDelete() },
    ]);
  }

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text variant="titleMedium">Identité</Text>
        <TextInput label="Nom" value={v.nom} onChangeText={set('nom')} mode="outlined" />
        <TextInput label="Concept" value={v.concept} onChangeText={set('concept')} mode="outlined" />

        <Text variant="titleMedium" style={styles.section}>
          Tendances
        </Text>
        {TENDANCES.map((t) => (
          <View key={t.key} style={styles.row}>
            <NumberField fieldKey={t.key} label={t.label} value={v[t.key]} onChange={setField} />
            <NumberField
              fieldKey={`${t.key}Sub`}
              label={`${t.label} (puces)`}
              value={v[`${t.key}Sub`]}
              onChange={setField}
            />
          </View>
        ))}

        <Text variant="titleMedium" style={styles.section}>
          Caractéristiques
        </Text>
        <View style={styles.grid}>
          {CARACTERISTIQUES.map((c) => (
            <NumberField key={c.key} fieldKey={c.key} label={c.abbr} value={v[c.key]} onChange={setField} />
          ))}
        </View>

        <Text variant="titleMedium" style={styles.section}>
          Attributs
        </Text>
        <View style={styles.grid}>
          {ATTRIBUTS.map((a) => (
            <NumberField key={a.key} fieldKey={a.key} label={a.label} value={v[a.key]} onChange={setField} />
          ))}
        </View>

        <Text variant="titleMedium" style={styles.section}>
          Santé (max par niveau)
        </Text>
        <View style={styles.grid}>
          {WOUND_LEVELS.map((w) => (
            <NumberField
              key={w.key}
              fieldKey={`${w.key}Max`}
              label={w.label}
              value={v[`${w.key}Max`]}
              onChange={setField}
            />
          ))}
        </View>

        <Text variant="titleMedium" style={styles.section}>
          Ressources (max)
        </Text>
        <View style={styles.grid}>
          {RESOURCES.map((r) => (
            <NumberField
              key={r.key}
              fieldKey={`${r.key}Max`}
              label={r.label}
              value={v[`${r.key}Max`]}
              onChange={setField}
            />
          ))}
        </View>

        <Text variant="titleMedium" style={styles.section}>
          Biographie
        </Text>
        <TextInput
          label="Biographie"
          value={v.biographie}
          onChangeText={set('biographie')}
          mode="outlined"
          multiline
          numberOfLines={4}
        />

        {onDelete ? (
          <Button
            mode="outlined"
            textColor="#B3261E"
            onPress={confirmDelete}
            disabled={busy}
            style={styles.section}>
            Supprimer
          </Button>
        ) : null}
      </ScrollView>

      <FAB
        icon="content-save"
        label={submitLabel}
        onPress={save}
        disabled={busy || v.nom.trim() === ''}
        style={styles.fab}
      />
      <Snackbar visible={saved} onDismiss={() => setSaved(false)} duration={1500}>
        Enregistré
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  fab: { position: 'absolute', right: 16, bottom: 16 },
  container: { padding: 16, gap: 12, paddingBottom: 96 },
  section: { marginTop: 8 },
  row: { flexDirection: 'row', gap: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
});
