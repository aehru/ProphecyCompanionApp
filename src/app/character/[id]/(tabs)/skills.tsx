import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';

import SkillsView from '@/components/skills-view';
import { characterFallback } from '@/components/ui/character-gate';
import { useCharacterId } from '@/hooks/use-character-id';
import { useCharacterState } from '@/hooks/use-character-state';
import { asNumRecord } from '@/lib/character-values';
import { skillsQuery } from '@/repositories/skills';

export default function CharacterSkillsScreen() {
  const numId = useCharacterId();
  // Reload on focus so attribut values edited elsewhere keep the totals correct.
  const { char } = useCharacterState(numId, { reloadOnFocus: true });
  const { data: skills } = useLiveQuery(skillsQuery(numId));

  const fallback = characterFallback(char);
  if (fallback || !char) return fallback;

  const rec = asNumRecord(char);

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <SkillsView skills={skills ?? []} attributValue={(a) => rec[a] ?? 0} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 12, gap: 12, paddingBottom: 24 },
});
