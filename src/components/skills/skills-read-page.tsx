// One attribut's COMP · MOD · TOT block in read mode — a pager page, or one
// section of the search results.
//
// A PAGE carries no section title: the strip already names the attribut, so an
// « PHYSIQUE » eyebrow right under the « Physique » tab would only repeat it. In
// the search results the strip is covered and nothing else names the group, so
// the caller passes `title` and gets the DS <SectionCard> instead. Either way
// the rule, the legend and the rows are the same three pieces.

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

import { SkillColumnLegend, SkillRows } from '@/components/campaign/skill-groups-view';
import SectionCard from '@/components/ui/section-card';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';
import type { SkillGroup } from '@/lib/skill-groups';

export default function SkillsReadPage({
  group,
  attrVal,
  title,
}: {
  /** The attribut's group, or undefined when nothing is trained in it. */
  group?: SkillGroup;
  /** The sheet's attribut value — the group carries it, but an empty one has none. */
  attrVal: number;
  /** Set outside the pager, where the attribut isn't named by the strip. */
  title?: string;
}) {
  const theme = useProphecyTheme();

  const body = (
    <>
      {title ? (
        <View style={styles.legendRow}>
          <SkillColumnLegend density="comfortable" />
        </View>
      ) : (
        // No title: the attribut value takes the eyebrow's place, and the legend
        // rides the same rule instead of needing a row of its own.
        <View style={styles.header}>
          <Text style={[styles.attr, { color: theme.colors.onSurfaceVariant }]}>
            Attribut: {attrVal}
          </Text>
          <View style={[styles.rule, { backgroundColor: theme.prophecy.borderSoft }]} />
          <SkillColumnLegend density="comfortable" />
        </View>
      )}

      {group ? (
        <SkillRows group={group} density="comfortable" />
      ) : (
        <Text style={[styles.empty, { color: theme.colors.onSurfaceVariant }]}>
          Aucune compétence.
        </Text>
      )}
    </>
  );

  return title ? (
    <SectionCard title={title} helper={`Attribut: ${attrVal}`}>
      {body}
    </SectionCard>
  ) : (
    <View style={styles.root}>{body}</View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 10 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  legendRow: { alignItems: 'flex-end' },
  attr: { fontSize: 12 },
  rule: { flex: 1, height: 1 },
  empty: { textAlign: 'center', paddingVertical: 14, fontStyle: 'italic' },
});
