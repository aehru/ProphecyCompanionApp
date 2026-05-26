import React, { useCallback, useState } from 'react';
import { Alert, ScrollView, StyleSheet, TextInput as RNTextInput, View } from 'react-native';
import { Button, FAB, Snackbar, Text, TextInput, useTheme } from 'react-native-paper';

import {
  ATTRIBUTS,
  CARACTERISTIQUES,
  NUMERIC_KEYS,
  RESOURCES,
  TENDANCES,
  WOUND_LEVELS,
} from '@/constants/prophecy';
import type { Character, NewCharacter } from '@/db/schema';

type Values = Record<string, string>;

function toValues(c?: Partial<Character> | null): Values {
  const src = (c ?? {}) as Record<string, unknown>;
  const v: Values = {
    nom: (src.nom as string) ?? '',
    concept: (src.concept as string) ?? '',
    biographie: (src.biographie as string) ?? '',
  };
  for (const k of NUMERIC_KEYS) v[k] = src[k] != null ? String(src[k]) : '';
  return v;
}

function toCharacter(v: Values): Partial<NewCharacter> {
  const out: Record<string, unknown> = {
    nom: v.nom.trim(),
    concept: v.concept.trim(),
    biographie: v.biographie.trim(),
  };
  for (const k of NUMERIC_KEYS) {
    const n = parseInt(v[k], 10);
    out[k] = Number.isFinite(n) ? n : 0;
  }
  return out as Partial<NewCharacter>;
}

// Lightweight numeric field (plain RN TextInput) — far cheaper to mount than
// Paper's outlined TextInput, so ~20 of them don't jank the screen transition.
const NumberField = React.memo(function NumberField({
  fieldKey,
  label,
  value,
  onChange,
  outline,
  text,
  muted,
}: {
  fieldKey: string;
  label: string;
  value: string;
  onChange: (key: string, t: string) => void;
  outline: string;
  text: string;
  muted: string;
}) {
  return (
    <View style={styles.numField}>
      <Text style={[styles.numLabel, { color: muted }]}>{label}</Text>
      <RNTextInput
        value={value}
        onChangeText={(t) => onChange(fieldKey, t.replace(/[^0-9]/g, ''))}
        keyboardType="number-pad"
        style={[styles.numInput, { borderColor: outline, color: text }]}
      />
    </View>
  );
});

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
  const theme = useTheme();
  const outline = theme.colors.outline;
  const text = theme.colors.onSurface;
  const muted = theme.colors.onSurfaceVariant;
  const [v, setV] = useState<Values>(() => toValues(initial));
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const set = (k: string) => (t: string) => setV((prev) => ({ ...prev, [k]: t }));
  // Stable setter so memoized NumberFields don't all re-render on each keystroke.
  const setField = useCallback((k: string, t: string) => setV((prev) => ({ ...prev, [k]: t })), []);

  async function save() {
    setBusy(true);
    try {
      await onSubmit(toCharacter(v));
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
      <TextInput
        label="Concept"
        value={v.concept}
        onChangeText={set('concept')}
        mode="outlined"
      />

      <Text variant="titleMedium" style={styles.section}>
        Tendances
      </Text>
      {TENDANCES.map((t) => (
        <View key={t.key} style={styles.row}>
          <NumberField
            fieldKey={t.key}
            label={t.label}
            value={v[t.key]}
            onChange={setField}
            outline={outline}
            text={text}
            muted={muted}
          />
          <NumberField
            fieldKey={`${t.key}Sub`}
            label={`${t.label} (puces)`}
            value={v[`${t.key}Sub`]}
            onChange={setField}
            outline={outline}
            text={text}
            muted={muted}
          />
        </View>
      ))}

      <Text variant="titleMedium" style={styles.section}>
        Caractéristiques
      </Text>
      <View style={styles.grid}>
        {CARACTERISTIQUES.map((c) => (
          <NumberField
            key={c.key}
            fieldKey={c.key}
            label={c.abbr}
            value={v[c.key]}
            onChange={setField}
            outline={outline}
            text={text}
            muted={muted}
          />
        ))}
      </View>

      <Text variant="titleMedium" style={styles.section}>
        Attributs
      </Text>
      <View style={styles.grid}>
        {ATTRIBUTS.map((a) => (
          <NumberField
            key={a.key}
            fieldKey={a.key}
            label={a.label}
            value={v[a.key]}
            onChange={setField}
            outline={outline}
            text={text}
            muted={muted}
          />
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
            outline={outline}
            text={text}
            muted={muted}
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
            outline={outline}
            text={text}
            muted={muted}
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
  numField: { flexGrow: 1, flexBasis: 90, minWidth: 90 },
  numLabel: { fontSize: 12, marginBottom: 2 },
  numInput: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 16,
  },
});
