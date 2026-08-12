// Read-mode search results: every attribut whose skills match, each as its own
// titled section.
//
// It owns the grouping rather than taking it from the screen, so the second
// `groupSkills` pass only exists while the search layer is actually open.

import React from 'react';
import { StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';

import SkillsReadPage from '@/components/skills/skills-read-page';
import type { Skill } from '@/db/schema';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';
import { useSkillGroups } from '@/hooks/use-skill-groups';
import type { ModifierSource } from '@/lib/modifiers';

export default function SkillsSearchResults({
  skills,
  attributs,
  effects,
  wound,
  query,
}: {
  skills: Skill[];
  attributs: Record<string, number>;
  effects: ModifierSource[];
  wound: number;
  query: string;
}) {
  const theme = useProphecyTheme();
  const groups = useSkillGroups({ skills, attributs, effects, wound, query });

  if (query.trim() === '') {
    return (
      <Text style={[styles.empty, { color: theme.colors.onSurfaceVariant }]}>
        Saisissez une compétence à rechercher.
      </Text>
    );
  }
  if (groups.length === 0) {
    return (
      <Text style={[styles.empty, { color: theme.colors.onSurfaceVariant }]}>Aucun résultat.</Text>
    );
  }
  return (
    <>
      {groups.map((g) => (
        <SkillsReadPage key={g.key} group={g} attrVal={g.attrVal} title={g.label} />
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  empty: { textAlign: 'center', paddingVertical: 14, fontStyle: 'italic' },
});
