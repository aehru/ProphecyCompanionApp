import { type Href, Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { FAB, IconButton, Text } from 'react-native-paper';

import Bullets from '@/components/bullets';
import CharacterForm from '@/components/character-form';
import TendancesTriangle from '@/components/tendances-triangle';
import InfoRow from '@/components/ui/info-row';
import SectionCard from '@/components/ui/section-card';
import StatChip from '@/components/ui/stat-chip';
import { ATTRIBUTS, CARACTERISTIQUES, RESOURCES, WOUND_LEVELS } from '@/constants/prophecy';
import { useCharacterState } from '@/hooks/use-character-state';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';
import { asNumRecord, num, txt } from '@/lib/character-values';
import { deleteCharacter, updateCharacter } from '@/repositories/characters';

export default function CharacterDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const numId = Number(id);
  const router = useRouter();
  const theme = useProphecyTheme();
  // Reload on focus so values edited in the status screen show up on return.
  const { char, state, reload } = useCharacterState(numId, { reloadOnFocus: true });
  const [editing, setEditing] = useState(false);

  if (char === undefined) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
      </View>
    );
  }
  if (char === null) {
    return (
      <View style={styles.centered}>
        <Text>Personnage introuvable.</Text>
      </View>
    );
  }

  const rec = asNumRecord(char);
  const stRec = asNumRecord(state);

  if (editing) {
    return (
      <>
        <Stack.Screen
          options={{
            title: char.nom || 'Personnage',
            headerRight: () => <IconButton icon="close" onPress={() => setEditing(false)} />,
          }}
        />
        <CharacterForm
          initial={char}
          submitLabel="Enregistrer"
          onSubmit={async (data) => {
            await updateCharacter(numId, data);
            reload();
            setEditing(false);
          }}
          onDelete={async () => {
            await deleteCharacter(numId);
            router.back();
          }}
        />
      </>
    );
  }

  return (
    <View style={styles.root}>
      <Stack.Screen
        options={{
          title: char.nom || 'Personnage',
          headerRight: () => (
            <IconButton icon="pencil" onPress={() => setEditing(true)} />
          ),
        }}
      />
      <ScrollView contentContainerStyle={styles.container}>
        <SectionCard title="TENDANCES">
          <TendancesTriangle get={(k) => ({ value: rec[k] ?? 0, sub: rec[`${k}Sub`] ?? 0 })} />
        </SectionCard>

        <SectionCard title="ATTRIBUTS">
          <View style={styles.grid}>
            {ATTRIBUTS.map((a) => (
              <StatChip key={a.key} label={a.label} value={num(rec[a.key])} />
            ))}
          </View>
        </SectionCard>

        <SectionCard title="CARACTÉRISTIQUES">
          <View style={styles.grid}>
            {CARACTERISTIQUES.map((c) => (
              <StatChip key={c.key} label={c.abbr} value={num(rec[c.key])} />
            ))}
          </View>
        </SectionCard>

        <SectionCard title="SANTÉ">
          {WOUND_LEVELS.map((w) => (
            <View key={w.key} style={styles.healthRow}>
              <Text style={[styles.healthLabel, { color: theme.colors.onSurfaceVariant }]}>
                {w.label}
              </Text>
              <Bullets
                count={rec[`${w.key}Max`] ?? 0}
                filled={stRec[`${w.key}Current`] ?? 0}
                color={theme.colors.error}
                size={14}
                gap={4}
                style={styles.healthDots}
              />
            </View>
          ))}
        </SectionCard>

        <SectionCard title="RESSOURCES (MAX)">
          {RESOURCES.map((r) => (
            <InfoRow key={r.key} label={r.label} value={num(rec[`${r.key}Max`])} />
          ))}
          <InfoRow label="Initiative" value={num(rec.initiativeMax)} />
        </SectionCard>

        <SectionCard title="BIOGRAPHIE">
          <Text>{txt(char.biographie)}</Text>
        </SectionCard>
      </ScrollView>
      <FAB
        icon="heart-pulse"
        label="Statut"
        style={styles.fab}
        onPress={() => router.push(`/character/${numId}/status` as Href)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  container: { padding: 12, gap: 12, paddingBottom: 96 },
  fab: { position: 'absolute', right: 16, bottom: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  healthRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  healthLabel: { fontSize: 15 },
  healthDots: { flexShrink: 1, justifyContent: 'flex-end' },
  tendanceRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 1,
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
  },
});
