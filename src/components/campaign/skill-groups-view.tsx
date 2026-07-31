// Grouped trained skills, as the GM reads them: one block per attribut, one row
// per skill, COMP · MOD · TOT columns. The grouping itself is pure and lives in
// lib/skill-groups; this file only draws the result.

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

import { useProphecyTheme } from '@/hooks/use-prophecy-theme';
import { fmtSignedMod } from '@/lib/modifiers';
import type { SkillGroup } from '@/lib/skill-groups';

/** Render grouped trained skills (shared by the Compagnie card and detail sheet). */
export default function SkillGroupsView({
  groups,
  emptyLabel = 'Aucune compétence.',
  compact = false,
}: {
  groups: SkillGroup[];
  emptyLabel?: string;
  compact?: boolean;
}) {
  const theme = useProphecyTheme();
  if (groups.length === 0) {
    return (
      <Text
        style={{
          textAlign: 'center',
          paddingVertical: 14,
          fontStyle: 'italic',
          color: theme.colors.onSurfaceVariant,
        }}>
        {emptyLabel}
      </Text>
    );
  }
  return (
    <View style={{ gap: compact ? 12 : 16 }}>
      {groups.map((g) => (
        <SkillGroupBlock key={g.key} group={g} />
      ))}
    </View>
  );
}

/** One attribut block: coloured header with the attribut value, then its rows. */
function SkillGroupBlock({ group: g }: { group: SkillGroup }) {
  const theme = useProphecyTheme();
  return (
    <View style={{ gap: 6 }}>
      <View style={styles.groupHeader}>
        <View style={[styles.groupDot, { backgroundColor: g.color }]} />
        <Text style={{ fontSize: 9.5, fontWeight: '700', letterSpacing: 0.6, color: g.color }}>
          {g.label.toUpperCase()}
        </Text>
        <View
          style={[styles.attrBadge, { borderColor: theme.prophecy.borderSoft, backgroundColor: theme.colors.surfaceVariant }]}>
          <Text style={{ fontFamily: 'Cinzel_600SemiBold', fontSize: 10, fontWeight: '700', color: g.color }}>
            {g.attrVal}
          </Text>
        </View>
        <View style={styles.spacer} />
        <Text style={{ fontSize: 8, fontWeight: '700', letterSpacing: 0.4, color: theme.colors.onSurfaceVariant }}>
          COMP · MOD · TOT
        </Text>
      </View>
      {g.skills.map((s) => (
        <SkillLine key={s.key} skill={s} color={g.color} />
      ))}
    </View>
  );
}

/** One skill line: name, then the COMP · MOD · TOT columns. */
function SkillLine({ skill: s, color }: { skill: SkillGroup['skills'][number]; color: string }) {
  const theme = useProphecyTheme();
  return (
    <View style={[styles.skillRow, s.isSpec && styles.skillRowSpec]}>
      <Text
        numberOfLines={1}
        style={{
          flex: 1,
          fontSize: 12.5,
          color: s.isSpec ? theme.colors.onSurfaceVariant : theme.colors.onSurface,
          fontStyle: s.isSpec ? 'italic' : 'normal',
        }}>
        {s.isSpec ? `↳ ${s.name}` : s.name}
      </Text>
      <View style={styles.skillVals}>
        <Text
          style={{ fontFamily: 'Cinzel_600SemiBold', fontSize: 12.5, color, minWidth: 12, textAlign: 'right' }}>
          {s.value}
        </Text>
        {/* Bonus/malus column: signed, green up / brick down, muted dash at 0. */}
        <Text
          style={{
            fontFamily: 'Cinzel_600SemiBold',
            fontSize: 12,
            minWidth: 24,
            textAlign: 'center',
            color:
              s.bonus === 0
                ? theme.colors.onSurfaceVariant
                : s.bonus < 0
                  ? theme.colors.error
                  : theme.colors.primary,
          }}>
          {s.bonus === 0 ? '—' : fmtSignedMod(s.bonus)}
        </Text>
        <View style={[styles.totalBadge, { backgroundColor: color }]}>
          <Text style={{ fontFamily: 'Cinzel_600SemiBold', fontSize: 11.5, fontWeight: '700', color: theme.colors.onPrimary }}>
            {s.total}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  groupHeader: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  attrBadge: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 5, paddingHorizontal: 5, paddingVertical: 1 },
  groupDot: { width: 7, height: 7, borderRadius: 2 },
  spacer: { flex: 1 },
  skillRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  skillRowSpec: { paddingLeft: 14 },
  skillVals: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  totalBadge: { borderRadius: 5, paddingHorizontal: 6, paddingVertical: 1, minWidth: 18, alignItems: 'center' },
});
