import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { KeyboardStickyView } from 'react-native-keyboard-controller';
import { Divider, Text } from 'react-native-paper';

import SkillFilterBar from '@/components/skill-filter-bar';
import SectionCard from '@/components/ui/section-card';
import { ATTRIBUT_LABEL } from '@/constants/prophecy';
import type { Skill } from '@/db/schema';
import { contentWidth } from '@/hooks/use-layout';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';
import { useSkillFilter } from '@/hooks/use-skill-filter';
import { fmtSignedMod } from '@/lib/modifiers';

/**
 * Read-only skills list. Only owned skills (value > 0) are passed in. Grouped
 * into one tab per attribut to avoid a long scroll; the search bar filters
 * across ALL attributs (global) and overrides the active tab. Each line shows
 * the skill value and the total (skill value + its linked attribut + any active
 * wound malus / temporary effect on that attribut, shown as a badge).
 */
export default function SkillsView({
  skills,
  attributValue,
  modifier,
}: {
  skills: Skill[];
  attributValue: (attribut: string) => number;
  // Net roll modifier for a skill: wound + effects on its attribut/'all' + any
  // effect targeting this skill by name. Folded into the total; a non-zero value
  // also shows a signed badge.
  modifier?: (skill: Skill) => number;
}) {
  const theme = useProphecyTheme();
  const { search, setSearch, activeAttr, setActiveAttr, q, searching, title } = useSkillFilter();

  // Base skills carry the group; specializations render indented under their
  // mother. A specialization whose mother isn't owned gets a greyed "non acquise"
  // ghost header (the GM may allow a spec without the base skill). When searching,
  // a matching mother shows all its specs; otherwise only matching specs show.
  const specsByMother = new Map<string, Skill[]>();
  for (const s of skills) {
    if (s.parentName) {
      const list = specsByMother.get(s.parentName) ?? [];
      list.push(s);
      specsByMother.set(s.parentName, list);
    }
  }
  const bases = skills.filter((s) => !s.parentName);
  const baseNames = new Set(bases.map((b) => b.name));

  type Item = { kind: 'base' | 'spec'; skill: Skill } | { kind: 'ghost'; mother: string };
  const items: Item[] = [];
  for (const b of bases) {
    const specs = specsByMother.get(b.name) ?? [];
    if (searching) {
      const bMatch = b.name.toLowerCase().includes(q);
      const matchSpecs = specs.filter((sp) => bMatch || sp.name.toLowerCase().includes(q));
      if (!bMatch && matchSpecs.length === 0) continue;
      items.push({ kind: 'base', skill: b });
      matchSpecs.forEach((sp) => items.push({ kind: 'spec', skill: sp }));
    } else {
      if (b.attribut !== activeAttr) continue;
      items.push({ kind: 'base', skill: b });
      specs.forEach((sp) => items.push({ kind: 'spec', skill: sp }));
    }
  }

  // Mother-less specializations → ghost group (mother header + indented specs).
  const orphanByMother = new Map<string, Skill[]>();
  for (const s of skills) {
    if (!s.parentName || baseNames.has(s.parentName)) continue;
    const inTab = searching
      ? s.parentName.toLowerCase().includes(q) || s.name.toLowerCase().includes(q)
      : s.attribut === activeAttr;
    if (!inTab) continue;
    const list = orphanByMother.get(s.parentName) ?? [];
    list.push(s);
    orphanByMother.set(s.parentName, list);
  }
  for (const [mother, mspecs] of orphanByMother) {
    items.push({ kind: 'ghost', mother });
    mspecs.forEach((sp) => items.push({ kind: 'spec', skill: sp }));
  }

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.list}
        contentContainerStyle={[styles.listContent, contentWidth]}
        keyboardShouldPersistTaps="handled">
        <SectionCard title={title}>
          <View style={styles.legend}>
            <Text style={[styles.legendVal, { color: theme.colors.onSurfaceVariant }]}>Val</Text>
            <Text style={[styles.legendTot, { color: theme.colors.primary }]}>Total</Text>
          </View>

          {items.map((item, i) => {
            if (item.kind === 'ghost') {
              return (
                <View key={`ghost-${item.mother}`}>
                  {i > 0 && <Divider style={styles.divider} />}
                  <Text style={[styles.ghostHeader, { color: theme.colors.onSurfaceVariant }]}>
                    {item.mother} · non acquise
                  </Text>
                </View>
              );
            }
            const s = item.skill;
            const spec = item.kind === 'spec';
            const mod = modifier?.(s) ?? 0;
            // Specializations show their short label, indented under the mother.
            const displayName = spec ? s.specLabel?.trim() || '(spécialisation)' : s.name;
            return (
              <View key={s.id}>
                {i > 0 && !spec && <Divider style={styles.divider} />}
                <View style={styles.row}>
                  <View style={[styles.nameCol, spec && styles.specName]}>
                    <Text style={spec ? { color: theme.colors.onSurfaceVariant } : undefined}>
                      {spec ? `↳ ${displayName}` : displayName}
                    </Text>
                    {searching ? (
                      <Text style={[styles.attr, { color: theme.colors.onSurfaceVariant }]}>
                        {ATTRIBUT_LABEL[s.attribut] ?? '—'}
                      </Text>
                    ) : null}
                  </View>
                  <Text style={styles.value}>{s.value}</Text>
                  <View style={styles.totalCol}>
                    <Text style={[styles.total, { color: theme.colors.primary }]}>
                      {s.value + attributValue(s.attribut) + mod}
                    </Text>
                    {mod !== 0 ? (
                      <Text
                        style={[
                          styles.mod,
                          { color: mod > 0 ? theme.colors.primary : theme.colors.error },
                        ]}>
                        ({fmtSignedMod(mod)})
                      </Text>
                    ) : null}
                  </View>
                </View>
              </View>
            );
          })}

          {items.length === 0 ? (
            <Text style={{ color: theme.colors.onSurfaceVariant }}>
              {searching ? 'Aucun résultat.' : 'Aucune compétence.'}
            </Text>
          ) : null}
        </SectionCard>
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
  listContent: { padding: 12, gap: 12 },
  filterBar: { padding: 12, gap: 8, borderTopWidth: StyleSheet.hairlineWidth },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  nameCol: { flex: 1 },
  specName: { paddingLeft: 12 },
  ghostHeader: { fontSize: 15, fontStyle: 'italic' },
  attr: { fontSize: 12 },
  value: { width: 36, textAlign: 'center', fontSize: 16 },
  totalCol: { width: 60, flexDirection: 'row', justifyContent: 'center', alignItems: 'baseline', gap: 3 },
  total: { textAlign: 'center', fontSize: 16, fontWeight: '700' },
  mod: { fontSize: 12, fontWeight: '700' },
  divider: { marginVertical: 6 },
  legend: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
  legendVal: { width: 36, textAlign: 'center', fontSize: 11 },
  legendTot: { width: 60, textAlign: 'center', fontSize: 11 },
});
