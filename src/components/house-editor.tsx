// The pieces every « Maison » catalogue editor shares (manœuvres, Faveurs):
// the write-through text field, the Supprimer / Terminer row, and the modal
// screen that loads the row. Each editor keeps only what is its own — its
// fields, its warnings, its delete.

import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { Button, HelperText, Text, TextInput } from 'react-native-paper';

import { dsIcon } from '@/components/ui/icon';
import { useDebouncedText } from '@/hooks/use-debounced-text';
import { contentWidth } from '@/hooks/use-layout';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';
import { Alert } from '@/lib/alert';

/**
 * One text column of `row`, debounced into `patch`. Nothing BLOCKS: an empty
 * `required` field says so, and `warn` (a grammar the cell is read through)
 * explains a value it cannot read — the value is kept as typed either way.
 */
export function WriteThroughField<K extends string>({
  row,
  field,
  label,
  placeholder,
  patch,
  multiline = false,
  required = false,
  warn,
}: {
  row: Record<NoInfer<K>, string>;
  field: K;
  label: string;
  placeholder?: string;
  patch: (data: Partial<Record<K, string>>) => void;
  multiline?: boolean;
  required?: boolean;
  warn?: (value: string) => string | null;
}) {
  const [value, setValue] = useDebouncedText(row[field], (v) =>
    patch({ [field]: v } as Partial<Record<K, string>>),
  );
  const warning = required && value.trim() === '' ? `${label} : requis` : (warn?.(value) ?? null);
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

/**
 * « Supprimer » (confirmed — `confirm` is the question, naming what is lost)
 * and « Terminer ». `onDelete` performs the delete and leaves the screen.
 */
export function HouseEditorActions({
  confirm,
  onDelete,
  onClose,
}: {
  confirm: string;
  onDelete: () => void;
  onClose: () => void;
}) {
  const theme = useProphecyTheme();
  const confirmDelete = () =>
    Alert.alert('Supprimer', confirm, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: onDelete },
    ]);

  return (
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
  );
}

/**
 * A house entry's editor as a modal screen. Device-wide entries, so these
 * routes sit at the root and not under a character. The route loads `row`
 * (a live query); a missing one says `notFound` rather than a blank form.
 */
export function HouseEntryScreen<T>({
  row,
  notFound,
  children,
}: {
  row: T | undefined;
  notFound: string;
  children: (row: T, close: () => void) => React.ReactNode;
}) {
  const router = useRouter();
  const theme = useProphecyTheme();

  if (!row) {
    return (
      <View style={styles.centered}>
        <Text style={{ color: theme.colors.onSurfaceVariant }}>{notFound}</Text>
      </View>
    );
  }

  return (
    <KeyboardAwareScrollView
      contentContainerStyle={[styles.container, contentWidth]}
      bottomOffset={24}>
      {children(row, () => router.back())}
    </KeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, marginTop: 8 },
  actionBtn: { flexShrink: 1 },
  container: { padding: 16, gap: 12, paddingBottom: 48 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
});
