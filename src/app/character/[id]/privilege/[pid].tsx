import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { Button, Text, TextInput } from 'react-native-paper';

import NumberField from '@/components/number-field';
import { CASTE_LABEL, PRIVILEGE_FAMILIES } from '@/constants/prophecy';
import type { NewPrivilege, Privilege } from '@/db/schema';
import { useDebouncedText } from '@/hooks/use-debounced-text';
import { contentWidth } from '@/hooks/use-layout';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';
import { Alert } from '@/lib/alert';
import { detachWrite } from '@/repositories/log';
import { deletePrivilege, privilegeQuery, updatePrivilege } from '@/repositories/privileges';

/**
 * One taken privilège (modal): the rulebook paragraph, then the two things that
 * belong to this character's copy — the tier paid and a précision. Edits persist
 * live (debounced).
 */
export default function PrivilegeModal() {
  const { pid } = useLocalSearchParams<{ id: string; pid: string }>();
  const theme = useProphecyTheme();
  const { data } = useLiveQuery(privilegeQuery(Number(pid)), [pid]);
  const row = data?.[0];

  if (!row) {
    return (
      <View style={styles.centered}>
        <Text style={{ color: theme.colors.onSurfaceVariant }}>Privilège introuvable.</Text>
      </View>
    );
  }
  // Keyed by id so the debounced note starts from this row's value.
  return <PrivilegeBody key={row.id} row={row} />;
}

function PrivilegeBody({ row }: { row: Privilege }) {
  const router = useRouter();
  const theme = useProphecyTheme();
  const patch = (d: Partial<NewPrivilege>) =>
    detachWrite('privileges', updatePrivilege(row.id, d), { privilegeId: row.id });
  const [note, setNote] = useDebouncedText(row.note, (v) => patch({ note: v }));
  const family = PRIVILEGE_FAMILIES.find((f) => f.key === row.family)?.label ?? row.family;

  const confirmDelete = () =>
    Alert.alert('Retirer', `Retirer « ${row.name} » ?`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Retirer',
        style: 'destructive',
        onPress: () =>
          detachWrite('privileges', deletePrivilege(row.id).then(() => router.back()), {
            privilegeId: row.id,
          }),
      },
    ]);

  return (
    <KeyboardAwareScrollView
      contentContainerStyle={[styles.container, contentWidth]}
      bottomOffset={24}>
      <Text variant="headlineSmall" style={styles.name}>
        {row.name}
      </Text>
      <Text style={{ color: theme.colors.onSurfaceVariant }}>
        {[CASTE_LABEL[row.caste] ?? row.caste, family, row.darkOrders ? 'Ordres Noirs' : '']
          .filter(Boolean)
          .join(' · ')}
      </Text>
      <Text style={styles.body}>{row.description}</Text>

      <NumberField
        fieldKey="cost"
        label="Coût payé"
        value={row.cost ? String(row.cost) : ''}
        onChange={(_, v) => patch({ cost: Math.max(0, Number(v) || 0) })}
        style={styles.costField}
      />
      <TextInput
        label="Précision"
        placeholder="Royaume, mentor, animal…"
        value={note}
        onChangeText={setNote}
      />

      <Button mode="outlined" icon="delete" textColor={theme.colors.error} onPress={confirmDelete}>
        Retirer
      </Button>
    </KeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12, paddingBottom: 160 },
  name: { fontFamily: 'Cinzel_600SemiBold' },
  body: { fontSize: 14, lineHeight: 21 },
  costField: { flexGrow: 0, flexBasis: 140, minWidth: 140 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
});
