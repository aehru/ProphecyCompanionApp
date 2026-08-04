import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { KeyboardStickyView } from 'react-native-keyboard-controller';
import { Text } from 'react-native-paper';

import { useAttrColors } from '@/components/campaign/roster-accents';
import { SkillColumnLegend, SkillRows } from '@/components/campaign/skill-groups-view';
import SkillFilterBar from '@/components/skill-filter-bar';
import SectionCard from '@/components/ui/section-card';
import type { Skill } from '@/db/schema';
import { contentWidth } from '@/hooks/use-layout';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';
import { useSkillFilter } from '@/hooks/use-skill-filter';
import type { ModifierSource } from '@/lib/modifiers';
import { groupSkills, type SharedSkill } from '@/lib/skill-groups';

/**
 * Read-only skills list. Only owned skills (value > 0) are passed in. Renders
 * through the SAME grouped presentation the GM reads on the Compagnie
 * (<SkillGroupsView>: coloured attribut header + COMP · MOD · TOT columns), so a
 * player and their GM read one layout — the arithmetic is `lib/skill-groups`
 * `groupSkills` in both places.
 *
 * The tabs stay: one per attribut, which simply picks the group to show (search
 * is global and overrides the tab, so a query shows every matching group).
 */
export default function SkillsView({
  skills,
  attributs,
  effects,
  wound,
}: {
  skills: Skill[];
  /** Attribut values off the character sheet, keyed by column key. */
  attributs: Record<string, number>;
  /** The character's effect rows (expired ones are ignored downstream). */
  effects: ModifierSource[];
  /** Current wound malus (non-positive) — it hits every roll. */
  wound: number;
}) {
  const theme = useProphecyTheme();
  const attrColors = useAttrColors();
  const { search, setSearch, activeAttr, setActiveAttr, q, searching, title } = useSkillFilter();

  // A specialization whose mother isn't owned is NOT a child row: it stands on
  // its own (the GM may allow a spec without the base skill), so it renders
  // un-indented under its full composite name instead of a bare short label.
  const shared = useMemo<SharedSkill[]>(() => {
    const baseNames = new Set(skills.filter((s) => !s.parentName).map((s) => s.name));
    return skills.map((s) =>
      s.parentName && !baseNames.has(s.parentName) ? { ...s, parentName: null, specLabel: null } : s,
    );
  }, [skills]);

  const groups = useMemo(
    () => groupSkills(shared, attributs, attrColors, q, effects, wound),
    [shared, attributs, attrColors, q, effects, wound],
  );
  // Searching is global; otherwise the active tab picks the one group to show.
  const visible = searching ? groups : groups.filter((g) => g.key === activeAttr);

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.list}
        contentContainerStyle={[styles.listContent, contentWidth]}
        keyboardShouldPersistTaps="handled">
        {visible.length === 0 ? (
          <SectionCard title={title}>
            <Text style={[styles.empty, { color: theme.colors.onSurfaceVariant }]}>
              {searching ? 'Aucun résultat.' : 'Aucune compétence.'}
            </Text>
          </SectionCard>
        ) : (
          // One DS section per attribut: the section header IS the group title
          // (Cinzel eyebrow + gold rule), so the tiny coloured header the GM's
          // packed card needs would only repeat it here.
          visible.map((g) => (
            <SectionCard key={g.key} title={g.label} helper={`Attribut: ${g.attrVal}`}>
              <View style={styles.legendRow}>
                <SkillColumnLegend density="comfortable" />
              </View>
              <SkillRows group={g} density="comfortable" />
            </SectionCard>
          ))
        )}
      </ScrollView>

      <KeyboardStickyView>
        <View
          style={[
            styles.filterBar,
            { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.outlineVariant },
          ]}>
          <SkillFilterBar
            search={search}
            onSearch={setSearch}
            activeAttr={activeAttr}
            onAttr={setActiveAttr}
          />
        </View>
      </KeyboardStickyView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  list: { flex: 1 },
  listContent: { padding: 12, gap: 16 },
  legendRow: { alignItems: 'flex-end' },
  empty: { textAlign: 'center', paddingVertical: 14, fontStyle: 'italic' },
  filterBar: { padding: 12, gap: 8, borderTopWidth: StyleSheet.hairlineWidth },
});
