import { type Href, Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { Card, IconButton, Text, useTheme } from 'react-native-paper';

import CharacterForm from '@/components/character-form';
import {
  ATTRIBUTS,
  CARACTERISTIQUES,
  RESOURCES,
  TENDANCES,
  WOUND_LEVELS,
} from '@/constants/prophecy';
import type { Character } from '@/db/schema';
import { deleteCharacter, getCharacter, updateCharacter } from '@/repositories/characters';

const num = (x?: number) => (x && x > 0 ? String(x) : '—');
const txt = (s?: string) => (s && s.trim() ? s.trim() : '—');

export default function CharacterDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const numId = Number(id);
  const router = useRouter();
  const theme = useTheme();
  const [char, setChar] = useState<Character | null | undefined>(undefined);
  const [editing, setEditing] = useState(false);

  const load = useCallback(() => {
    getCharacter(numId).then(setChar);
  }, [numId]);
  useEffect(() => {
    load();
  }, [load]);

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

  const rec = char as unknown as Record<string, number>;

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

  const Row = ({ label, value }: { label: string; value: string }) => (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, { color: theme.colors.onSurfaceVariant }]}>{label}</Text>
      <Text variant="titleMedium">{value}</Text>
    </View>
  );

  const Stat = ({ label, value }: { label: string; value: string }) => (
    <View style={[styles.chip, { borderColor: theme.colors.outlineVariant }]}>
      <Text style={[styles.chipLabel, { color: theme.colors.onSurfaceVariant }]}>{label}</Text>
      <Text variant="titleMedium">{value}</Text>
    </View>
  );

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <Card style={styles.card} mode="contained">
      <Card.Content style={styles.cardContent}>
        <Text variant="titleSmall" style={{ color: theme.colors.primary }}>
          {title}
        </Text>
        {children}
      </Card.Content>
    </Card>
  );

  return (
    <>
      <Stack.Screen
        options={{
          title: char.nom || 'Personnage',
          headerRight: () => (
            <View style={styles.headerActions}>
              <IconButton
                icon="sword-cross"
                onPress={() => router.push(`/character/${numId}/combat` as Href)}
              />
              <IconButton icon="pencil" onPress={() => setEditing(true)} />
            </View>
          ),
        }}
      />
      <ScrollView contentContainerStyle={styles.container}>
        <Section title="IDENTITÉ">
          <Row label="Nom" value={txt(char.nom)} />
          <Row label="Concept" value={txt(char.concept)} />
        </Section>

        <Section title="TENDANCES">
          {TENDANCES.map((t) => (
            <Row
              key={t.key}
              label={t.label}
              value={`${num(rec[t.key])}  •  ${num(rec[`${t.key}Sub`])} puces`}
            />
          ))}
        </Section>

        <Section title="CARACTÉRISTIQUES">
          <View style={styles.grid}>
            {CARACTERISTIQUES.map((c) => (
              <Stat key={c.key} label={c.abbr} value={num(rec[c.key])} />
            ))}
          </View>
        </Section>

        <Section title="ATTRIBUTS">
          <View style={styles.grid}>
            {ATTRIBUTS.map((a) => (
              <Stat key={a.key} label={a.label} value={num(rec[a.key])} />
            ))}
          </View>
        </Section>

        <Section title="SANTÉ (MAX)">
          {WOUND_LEVELS.map((w) => (
            <Row key={w.key} label={w.label} value={num(rec[`${w.key}Max`])} />
          ))}
        </Section>

        <Section title="RESSOURCES (MAX)">
          {RESOURCES.map((r) => (
            <Row key={r.key} label={r.label} value={num(rec[`${r.key}Max`])} />
          ))}
        </Section>

        <Section title="BIOGRAPHIE">
          <Text>{txt(char.biographie)}</Text>
        </Section>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  container: { padding: 12, gap: 12, paddingBottom: 32 },
  card: { borderRadius: 12 },
  cardContent: { gap: 8 },
  headerActions: { flexDirection: 'row' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowLabel: { fontSize: 15 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    minWidth: 64,
    alignItems: 'center',
  },
  chipLabel: { fontSize: 11, letterSpacing: 0.5 },
});
