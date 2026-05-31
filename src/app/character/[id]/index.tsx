import { type Href, Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { IconButton, Text, useTheme } from 'react-native-paper';

import CharacterForm from '@/components/character-form';
import InfoRow from '@/components/ui/info-row';
import SectionCard from '@/components/ui/section-card';
import StatChip from '@/components/ui/stat-chip';
import Bullets from '@/components/bullets';
import TendancesTriangle from '@/components/tendances-triangle';
import { ATTRIBUTS, CARACTERISTIQUES, RESOURCES, WOUND_LEVELS } from '@/constants/prophecy';
import type { ActualState, Character } from '@/db/schema';
import { asNumRecord, num, txt } from '@/lib/character-values';
import { getActualState } from '@/repositories/actual-state';
import { deleteCharacter, getCharacter, updateCharacter } from '@/repositories/characters';

export default function CharacterDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const numId = Number(id);
  const router = useRouter();
  const theme = useTheme();
  const [char, setChar] = useState<Character | null | undefined>(undefined);
  const [state, setState] = useState<ActualState | null>(null);
  const [editing, setEditing] = useState(false);

  const load = useCallback(() => {
    getCharacter(numId).then(setChar);
    getActualState(numId).then(setState);
  }, [numId]);

  // Reload on focus so values edited in the status screen show up on return.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

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
            load();
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
    <>
      <Stack.Screen
        options={{
          title: char.nom || 'Personnage',
          headerRight: () => (
            <View style={styles.headerActions}>
              <IconButton
                icon="heart-pulse"
                onPress={() => router.push(`/character/${numId}/status` as Href)}
              />
              <IconButton icon="pencil" onPress={() => setEditing(true)} />
            </View>
          ),
        }}
      />
      <ScrollView contentContainerStyle={styles.container}>
        <SectionCard title="IDENTITÉ">
          <InfoRow label="Nom" value={txt(char.nom)} />
          <InfoRow label="Concept" value={txt(char.concept)} />
        </SectionCard>

        <SectionCard title="TENDANCES">
          <TendancesTriangle get={(k) => ({ value: rec[k] ?? 0, sub: rec[`${k}Sub`] ?? 0 })} />
        </SectionCard>

        <SectionCard title="CARACTÉRISTIQUES">
          <View style={styles.grid}>
            {CARACTERISTIQUES.map((c) => (
              <StatChip key={c.key} label={c.abbr} value={num(rec[c.key])} />
            ))}
          </View>
        </SectionCard>

        <SectionCard title="ATTRIBUTS">
          <View style={styles.grid}>
            {ATTRIBUTS.map((a) => (
              <StatChip key={a.key} label={a.label} value={num(rec[a.key])} />
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
        </SectionCard>

        <SectionCard title="BIOGRAPHIE">
          <Text>{txt(char.biographie)}</Text>
        </SectionCard>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  container: { padding: 12, gap: 12, paddingBottom: 32 },
  headerActions: { flexDirection: 'row' },
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
