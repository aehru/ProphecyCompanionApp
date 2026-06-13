import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { type Href, useNavigation, useRouter } from 'expo-router';
import React, { useEffect, useLayoutEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { IconButton, Text } from 'react-native-paper';

import Bullets from '@/components/bullets';
import AppFab from '@/components/ui/app-fab';
import CharacterForm from '@/components/character-form';
import { characterFallback } from '@/components/ui/character-gate';
import TendancesTriangle from '@/components/tendances-triangle';
import InfoRow from '@/components/ui/info-row';
import SectionCard from '@/components/ui/section-card';
import StatChip from '@/components/ui/stat-chip';
import { ATTRIBUTS, CARACTERISTIQUES, MONEY, RESOURCES, WOUND_LEVELS } from '@/constants/prophecy';
import { useCharacterId } from '@/hooks/use-character-id';
import { useCharacterState } from '@/hooks/use-character-state';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';
import { asNumRecord, num, txt } from '@/lib/character-values';
import { armorQuery } from '@/repositories/armor';
import { deleteCharacter, updateCharacter } from '@/repositories/characters';
import { replaceSkills, skillsQuery } from '@/repositories/skills';

export default function CharacterResumeScreen() {
  const numId = useCharacterId();
  const router = useRouter();
  const navigation = useNavigation();
  const theme = useProphecyTheme();
  // Reload on focus so values edited in the status screen show up on return.
  const { char, state, reload } = useCharacterState(numId, { reloadOnFocus: true });
  const { data: skills } = useLiveQuery(skillsQuery(numId));
  const { data: armors } = useLiveQuery(armorQuery(numId));
  const [editing, setEditing] = useState(false);

  // Drive the tab header: character name + edit/close toggle.
  useLayoutEffect(() => {
    navigation.setOptions({
      title: char?.nom || 'Personnage',
      headerRight: () =>
        editing ? (
          <IconButton icon="close" onPress={() => setEditing(false)} />
        ) : (
          <IconButton icon="pencil" onPress={() => setEditing(true)} />
        ),
    });
  }, [navigation, char?.nom, editing]);

  // Leaving edit mode is meaningless once we navigate away; reset on blur.
  useEffect(() => navigation.addListener('blur', () => setEditing(false)), [navigation]);

  const fallback = characterFallback(char);
  if (fallback || !char) return fallback;

  const rec = asNumRecord(char);
  const stRec = asNumRecord(state);
  const equippedArmor = (armors ?? []).find((a) => a.equipped) ?? null;

  if (editing) {
    return (
      <CharacterForm
        initial={char}
        initialSkills={skills ?? []}
        submitLabel="Enregistrer"
        onSubmit={async (data, nextSkills) => {
          await updateCharacter(numId, data);
          await replaceSkills(numId, nextSkills);
          reload();
          setEditing(false);
        }}
        onDelete={async () => {
          await deleteCharacter(numId);
          router.back();
        }}
      />
    );
  }

  return (
    <View style={styles.root}>
      <KeyboardAwareScrollView contentContainerStyle={styles.container} bottomOffset={24}>
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

        {equippedArmor ? (
          <SectionCard title="ARMURE">
            <View style={styles.healthRow}>
              <Text style={[styles.healthLabel, { color: theme.colors.onSurfaceVariant }]}>
                {equippedArmor.name || 'Armure'}
              </Text>
              <Bullets
                count={equippedArmor.defenseMax}
                filled={equippedArmor.defenseCurrent}
                color={theme.colors.primary}
                size={14}
                gap={4}
                style={styles.healthDots}
              />
            </View>
          </SectionCard>
        ) : null}

        <SectionCard title="RESSOURCES (MAX)">
          {RESOURCES.map((r) => (
            <InfoRow key={r.key} label={r.label} value={num(rec[`${r.key}Max`])} />
          ))}
          <InfoRow label="Initiative" value={num(rec.initiativeMax)} />
        </SectionCard>

        <SectionCard title="ARGENT">
          <View style={styles.grid}>
            {MONEY.map((m) => (
              <StatChip key={m.key} label={m.abbr} value={String(stRec[m.key] ?? 0)} />
            ))}
          </View>
        </SectionCard>

        <SectionCard title="BIOGRAPHIE">
          <Text>{txt(char.biographie)}</Text>
        </SectionCard>
      </KeyboardAwareScrollView>
      <AppFab
        icon="heart-pulse"
        label="Statut"
        onPress={() => router.push(`/character/${numId}/status` as Href)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  container: { padding: 12, gap: 12, paddingBottom: 96 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  healthRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  healthLabel: { fontSize: 15 },
  healthDots: { flexShrink: 1, justifyContent: 'flex-end' },
});
