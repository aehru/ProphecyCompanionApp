// Grouped trained skills, as the GM reads them: one block per attribut, one row
// per skill, COMP · MOD · TOT columns. The grouping itself is pure and lives in
// lib/skill-groups; this file only draws the result.
//
// Two densities, one layout: 'compact' is the GM's (a roster card / bottom sheet
// packs four blocks at once), 'comfortable' is the player's own Compétences tab,
// which owns the whole screen for a single attribut and would otherwise read as
// fine print. Only type sizes and column widths change — the columns, the
// accents and the arithmetic stay identical, which is the point of sharing this
// file at all.

import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text, Tooltip } from 'react-native-paper';

import Icon, { type IconName } from '@/components/ui/icon';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';
import { fmtSignedMod } from '@/lib/modifiers';
import type { SkillGroup } from '@/lib/skill-groups';

/** How big the rows draw. See the file header for why there are two. */
export type SkillDensity = 'compact' | 'comfortable';

// The three value columns are FIXED widths (not minWidth): a two-digit total
// must not push its column and break the alignment down the block. The legend
// below reuses the very same widths and gap, so each label sits over its column.
const SCALE = {
  compact: { name: 12.5, value: 12.5, mod: 12, total: 11.5, legendIcon: 11, rowGap: 6, colGap: 7, valueW: 20, modW: 26, totalW: 26, badgePadV: 1, badgePadH: 6 },
  // Kept narrow on purpose: the columns eat into the skill name, which truncates
  // first on a small phone. These widths still hold a two-digit total.
  comfortable: { name: 15.5, value: 16, mod: 14, total: 14.5, legendIcon: 14, rowGap: 10, colGap: 8, valueW: 22, modW: 30, totalW: 32, badgePadV: 3, badgePadH: 4 },
} as const satisfies Record<SkillDensity, object>;

/** What each column header glyph means, revealed by its tooltip. */
const COLUMNS: { icon: IconName; hint: string }[] = [
  { icon: 'book', hint: 'Compétence seule' },
  { icon: 'plusminus', hint: 'Modificateur : blessures et effets actifs' },
  { icon: 'equals', hint: 'Total : compétence + attribut + modificateur' },
];

/**
 * The column headers, sized and spaced with the rows they head. Glyphs rather
 * than COMP · MOD · TOT: the words cost width the skill names need on a phone.
 * Each carries a Paper <Tooltip> (long-press on touch, hover on web) spelling
 * the column out.
 */
export function SkillColumnLegend({ density = 'compact' }: { density?: SkillDensity }) {
  const theme = useProphecyTheme();
  const sc = SCALE[density];
  const widths = [sc.valueW, sc.modW, sc.totalW];
  return (
    <View style={[styles.skillVals, { gap: sc.colGap }]}>
      {COLUMNS.map((c, i) => (
        <Tooltip key={c.icon} title={c.hint}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={c.hint}
            style={[styles.legendCell, { width: widths[i] }]}>
            <Icon name={c.icon} size={sc.legendIcon} color={theme.colors.onSurfaceVariant} />
          </Pressable>
        </Tooltip>
      ))}
    </View>
  );
}

/** A skill as its row knows it — what a caller needs to build a roll context. */
export type SkillLineData = SkillGroup['skills'][number];

/**
 * The rows of ONE group, without a header — for a caller that draws its own
 * (the player's tab titles each attribut with a DS <SectionCard>).
 *
 * `onRoll` turns the TOT badge into a roll target. Optional because this file is
 * shared with the GM's reading of someone else's character, where a total is a
 * number to read and not a die to throw.
 */
export function SkillRows({
  group: g,
  density = 'compact',
  onRoll,
}: {
  group: SkillGroup;
  density?: SkillDensity;
  onRoll?: (skill: SkillLineData) => void;
}) {
  return (
    <View style={{ gap: SCALE[density].rowGap }}>
      {g.skills.map((s) => (
        <SkillLine key={s.key} skill={s} color={g.color} density={density} onRoll={onRoll} />
      ))}
    </View>
  );
}

/** Render grouped trained skills (shared by the Compagnie card and detail sheet). */
export default function SkillGroupsView({
  groups,
  emptyLabel = 'Aucune compétence.',
  compact = false,
  density = 'compact',
  onRoll,
}: {
  groups: SkillGroup[];
  emptyLabel?: string;
  compact?: boolean;
  density?: SkillDensity;
  /** Turns every TOT badge into a roll target, as <SkillRows> already does. */
  onRoll?: (skill: SkillLineData) => void;
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
        <SkillGroupBlock key={g.key} group={g} density={density} onRoll={onRoll} />
      ))}
    </View>
  );
}

/** One attribut block: coloured header with the attribut value, then its rows. */
function SkillGroupBlock({
  group: g,
  density,
  onRoll,
}: {
  group: SkillGroup;
  density: SkillDensity;
  onRoll?: (skill: SkillLineData) => void;
}) {
  const theme = useProphecyTheme();
  return (
    <View style={{ gap: SCALE[density].rowGap }}>
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
        <SkillColumnLegend density={density} />
      </View>
      {g.skills.map((s) => (
        <SkillLine key={s.key} skill={s} color={g.color} density={density} onRoll={onRoll} />
      ))}
    </View>
  );
}

/** One skill line: name, then the COMP · MOD · TOT columns. */
function SkillLine({
  skill: s,
  color,
  density,
  onRoll,
}: {
  skill: SkillLineData;
  color: string;
  density: SkillDensity;
  onRoll?: (skill: SkillLineData) => void;
}) {
  const theme = useProphecyTheme();
  const sc = SCALE[density];
  return (
    <View style={[styles.skillRow, s.isSpec && styles.skillRowSpec]}>
      <Text
        numberOfLines={1}
        style={{
          flex: 1,
          fontSize: sc.name,
          color: s.isSpec ? theme.colors.onSurfaceVariant : theme.colors.onSurface,
          fontStyle: s.isSpec ? 'italic' : 'normal',
        }}>
        {s.isSpec ? `↳ ${s.name}` : s.name}
      </Text>
      <View style={[styles.skillVals, { gap: sc.colGap }]}>
        <Text
          style={{
            fontFamily: 'Cinzel_600SemiBold',
            fontSize: sc.value,
            color,
            width: sc.valueW,
            textAlign: 'center',
          }}>
          {s.value}
        </Text>
        {/* Bonus/malus column: signed, green up / brick down, muted dash at 0. */}
        <Text
          style={{
            fontFamily: 'Cinzel_600SemiBold',
            fontSize: sc.mod,
            width: sc.modW,
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
        {/* The badge IS the roll button when the caller wants one — it already
            reads as the row's one filled, tappable-looking cell, so a separate
            die icon per row would only cost the width the names need. */}
        <Pressable
          onPress={onRoll ? () => onRoll(s) : undefined}
          disabled={!onRoll}
          accessibilityRole={onRoll ? 'button' : undefined}
          accessibilityLabel={onRoll ? `Lancer ${s.name}, total ${s.total}` : undefined}
          style={({ pressed }) => [
            styles.totalBadge,
            {
              backgroundColor: color,
              width: sc.totalW,
              paddingVertical: sc.badgePadV,
              paddingHorizontal: sc.badgePadH,
              opacity: pressed ? 0.7 : 1,
            },
          ]}>
          <Text
            style={{
              fontFamily: 'Cinzel_600SemiBold',
              fontSize: sc.total,
              fontWeight: '700',
              color: theme.colors.onPrimary,
            }}>
            {s.total}
          </Text>
        </Pressable>
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
  legendCell: { alignItems: 'center' },
  totalBadge: { borderRadius: 5, paddingHorizontal: 6, paddingVertical: 1, minWidth: 18, alignItems: 'center' },
});
