import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { KeyboardStickyView } from 'react-native-keyboard-controller';
import { Divider, Text } from 'react-native-paper';

import SkillFilterBar from '@/components/skill-filter-bar';
import SectionCard from '@/components/ui/section-card';
import { ATTRIBUT_LABEL } from '@/constants/prophecy';
import type { Skill } from '@/db/schema';
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
  // Net wound + effect modifier for a skill's linked attribut. Folded into the
  // total; a non-zero value also shows a signed badge.
  modifier?: (attribut: string) => number;
}) {
  const theme = useProphecyTheme();
  const { search, setSearch, activeAttr, setActiveAttr, q, searching, title } = useSkillFilter();

  const visible = searching
    ? skills.filter((s) => s.name.toLowerCase().includes(q))
    : skills.filter((s) => s.attribut === activeAttr);

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled">
        <SectionCard title={title}>
          <View style={styles.legend}>
            <Text style={[styles.legendVal, { color: theme.colors.onSurfaceVariant }]}>Val</Text>
            <Text style={[styles.legendTot, { color: theme.colors.primary }]}>Total</Text>
          </View>

          {visible.map((s, i) => {
            const mod = modifier?.(s.attribut) ?? 0;
            return (
              <View key={s.id}>
                {i > 0 && <Divider style={styles.divider} />}
                <View style={styles.row}>
                  <View style={styles.nameCol}>
                    <Text>{s.name}</Text>
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

          {visible.length === 0 ? (
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
