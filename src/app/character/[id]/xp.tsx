import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

import ScenarioDialog from '@/components/xp/scenario-dialog';
import { VALEURS } from '@/constants/prophecy';
import type { XpAward } from '@/db/schema';
import { useCharacterId } from '@/hooks/use-character-id';
import { contentWidth } from '@/hooks/use-layout';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';
import { Alert } from '@/lib/alert';
import { awardTotal } from '@/lib/xp';
import { deleteXpAward, updateXpAward, xpAwardsQuery } from '@/repositories/xp-awards';

const VALEUR_LABEL: Record<string, string> = Object.fromEntries(VALEURS.map((v) => [v.key, v.label]));

/**
 * Every scénario this character has played, newest first: the Valeur staked,
 * the GM's five scores and what they came to. A row opens the same dialog the
 * Fiche uses, to fix a mistyped score or drop a scénario; the open one edits
 * only its name and Valeur, since it has no scores yet.
 */
export default function XpHistoryScreen() {
  const characterId = useCharacterId();
  const theme = useProphecyTheme();
  const { data } = useLiveQuery(xpAwardsQuery(characterId), [characterId]);
  const [editing, setEditing] = useState<XpAward | null>(null);

  const confirmDelete = (row: XpAward) =>
    Alert.alert('Supprimer ce scénario ?', 'Son Expérience sera retirée du total gagné.', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          setEditing(null);
          await deleteXpAward(row.id);
        },
      },
    ]);

  return (
    <ScrollView contentContainerStyle={[styles.container, contentWidth]}>
      {data?.length ? null : (
        <Text style={{ color: theme.colors.onSurfaceVariant }}>
          Aucun scénario. « Début de scénario », sur la Fiche, en ouvre un.
        </Text>
      )}
      {data?.map((row, i) => (
        <Pressable
          key={row.id}
          accessibilityRole="button"
          accessibilityHint="Modifier ce scénario"
          onPress={() => setEditing(row)}
          style={[styles.row, { borderBottomColor: theme.prophecy.borderSoft }]}>
          <View style={styles.main}>
            <Text style={styles.name} numberOfLines={1}>
              {row.label || `Scénario ${data.length - i}`}
            </Text>
            <Text style={[styles.sub, { color: theme.colors.onSurfaceVariant }]}>
              {row.startedAt.toLocaleDateString('fr-FR')} · {VALEUR_LABEL[row.chosenValeur]} ×2
            </Text>
            {row.endedAt ? (
              <Text style={[styles.sub, { color: theme.colors.onSurfaceVariant }]}>
                {VALEURS.map((v) => `${v.label} ${row[v.key]}`).join(' · ')}
              </Text>
            ) : null}
          </View>
          <Text style={[styles.points, { color: theme.colors.primary }]}>
            {row.endedAt ? `+${awardTotal(row)}` : 'En cours'}
          </Text>
        </Pressable>
      ))}
      {editing ? (
        <ScenarioDialog
          key={editing.id}
          mode={editing.endedAt ? 'edit' : 'start'}
          initial={editing}
          onDismiss={() => setEditing(null)}
          onDelete={() => confirmDelete(editing)}
          onSubmit={async (v) => {
            setEditing(null);
            await updateXpAward(
              editing.id,
              editing.endedAt
                ? { label: v.label, chosenValeur: v.chosenValeur, ...v.scores }
                : { label: v.label, chosenValeur: v.chosenValeur },
            );
          }}
        />
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 13, paddingVertical: 8, borderBottomWidth: 1 },
  main: { flex: 1, minWidth: 0 },
  name: { fontSize: 14, fontWeight: '600' },
  sub: { fontSize: 12, marginTop: 1 },
  points: { fontSize: 16, fontWeight: '600' },
});
