import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Divider, Text } from 'react-native-paper';

import SkillFilterBar from '@/components/skill-filter-bar';
import SectionCard from '@/components/ui/section-card';
import { ATTRIBUTS, ATTRIBUT_LABEL } from '@/constants/prophecy';
import type { Skill } from '@/db/schema';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';

/**
 * Read-only skills list. Only owned skills (value > 0) are passed in. Grouped
 * into one tab per attribut to avoid a long scroll; the search bar filters
 * across ALL attributs (global) and overrides the active tab. Each line shows
 * the skill value and the total (skill value + its linked attribut).
 */
export default function SkillsView({
  skills,
  attributValue,
}: {
  skills: Skill[];
  attributValue: (attribut: string) => number;
}) {
  const theme = useProphecyTheme();
  const [search, setSearch] = useState('');
  const [activeAttr, setActiveAttr] = useState<string>(ATTRIBUTS[0].key);

  const q = search.trim().toLowerCase();
  const searching = q !== '';
  const visible = searching
    ? skills.filter((s) => s.name.toLowerCase().includes(q))
    : skills.filter((s) => s.attribut === activeAttr);

  const title = searching ? 'RÉSULTATS' : (ATTRIBUT_LABEL[activeAttr] ?? 'COMPÉTENCES').toUpperCase();

  return (
    <View style={styles.root}>
      <SkillFilterBar
        search={search}
        onSearch={setSearch}
        activeAttr={activeAttr}
        onAttr={setActiveAttr}
      />

      <SectionCard title={title}>
        <View style={styles.legend}>
          <Text style={[styles.legendVal, { color: theme.colors.onSurfaceVariant }]}>Val</Text>
          <Text style={[styles.legendTot, { color: theme.colors.primary }]}>Total</Text>
        </View>

        {visible.map((s, i) => (
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
              <Text style={[styles.total, { color: theme.colors.primary }]}>
                {s.value + attributValue(s.attribut)}
              </Text>
            </View>
          </View>
        ))}

        {visible.length === 0 ? (
          <Text style={{ color: theme.colors.onSurfaceVariant }}>
            {searching ? 'Aucun résultat.' : 'Aucune compétence.'}
          </Text>
        ) : null}
      </SectionCard>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  nameCol: { flex: 1 },
  attr: { fontSize: 12 },
  value: { width: 36, textAlign: 'center', fontSize: 16 },
  total: { width: 60, textAlign: 'center', fontSize: 16, fontWeight: '700' },
  divider: { marginVertical: 6 },
  legend: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
  legendVal: { width: 36, textAlign: 'center', fontSize: 11 },
  legendTot: { width: 60, textAlign: 'center', fontSize: 11 },
});
