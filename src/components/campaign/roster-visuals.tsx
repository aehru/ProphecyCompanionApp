// Shared visual primitives for the campaign GM screens (Salon + Compagnie + the
// character detail sheet). Pure presentation — no DB, no network. They render
// the read-only projection the GM receives, so every prop is a plain number /
// string / boolean read defensively from the opaque `character` payload.
//
// Design source: the `GM Campaign.dc.html` design project (parchment & gold,
// Cinzel display + Noto Sans body). Colours flow through useProphecyTheme();
// the attribut / tendance accents that the MD3 scale does not carry are defined
// here per light/dark, matching the design's --dragon/--magic/--nature tokens.

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Chip, Text } from 'react-native-paper';

import { ATTRIBUTS, MAX_PUCES, TENDANCES } from '@/constants/prophecy';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';
import type { SocketStatus } from '@/lib/campaign-client';
import { fmtSignedMod, skillTarget } from '@/lib/modifiers';

const SERVER_STATUS_LABEL: Record<SocketStatus, string> = {
  online: 'En ligne',
  connecting: 'Connexion…',
  offline: 'Hors ligne',
};

/** Server-connection chip (distinct from a player's presence pill). */
export function ServerStatusChip({ status }: { status: SocketStatus }) {
  const theme = useProphecyTheme();
  return (
    <Chip
      compact
      icon={status === 'online' ? 'lan-connect' : 'lan-disconnect'}
      style={{
        backgroundColor:
          status === 'online' ? theme.prophecy.surfaceContainerLow : theme.colors.surfaceVariant,
      }}>
      {SERVER_STATUS_LABEL[status]}
    </Chip>
  );
}

// --- accents -------------------------------------------------------------------

/**
 * Per-attribut accent (Physique / Mental / Manuel / Social), keyed by the
 * attribut column key. The MD3 scale only carries secondary + tertiary, so the
 * dragon-brick and nature-green are literal here, split by scheme to stay
 * legible on both parchment and charcoal. Mirrors the design's ATTR_COLOR map.
 *
 * Module-level constants on purpose: the hooks below must return a STABLE
 * reference per scheme, because callers pass the map into useMemo deps (the
 * `groupSkills` memos in Compagnie / the GM sheet). A fresh object literal per
 * render would invalidate those memos on every render.
 */
const ATTR_COLORS_LIGHT: Record<string, string> = {
  physique: '#6C3A2C',
  mental: '#4F6475',
  manuel: '#A37B3F',
  social: '#5B7251',
};
const ATTR_COLORS_DARK: Record<string, string> = {
  physique: '#8C3E30',
  mental: '#6D8CA4',
  manuel: '#E1C37A',
  social: '#6E8C65',
};

// Reuse the attribut accents so the two screens read as one palette.
const TEND_COLORS_LIGHT: Record<string, string> = {
  dragon: ATTR_COLORS_LIGHT.physique,
  fatalite: ATTR_COLORS_LIGHT.mental,
  homme: ATTR_COLORS_LIGHT.social,
};
const TEND_COLORS_DARK: Record<string, string> = {
  dragon: ATTR_COLORS_DARK.physique,
  fatalite: ATTR_COLORS_DARK.mental,
  homme: ATTR_COLORS_DARK.social,
};

export function useAttrColors(): Record<string, string> {
  const theme = useProphecyTheme();
  return theme.dark ? ATTR_COLORS_DARK : ATTR_COLORS_LIGHT;
}

/** Tendance ring accents: Dragon → brick, Fatalité → slate, Homme → green. */
export function useTendColors(): Record<string, string> {
  const theme = useProphecyTheme();
  return theme.dark ? TEND_COLORS_DARK : TEND_COLORS_LIGHT;
}

// A small, fixed avatar palette (design assigns one accent per player). Picked
// deterministically from the name so a character keeps the same colour across
// sessions without any stored field. Values read fine on light and dark.
const AVATAR_ACCENTS = ['#5B7251', '#4F6475', '#A37B3F', '#6C3A2C', '#7A4D24', '#8C6A3F'];

export function playerAccent(nom: string): string {
  let h = 0;
  for (let i = 0; i < nom.length; i++) h = (h * 31 + nom.charCodeAt(i)) >>> 0;
  return AVATAR_ACCENTS[h % AVATAR_ACCENTS.length];
}

export function initials(nom: string): string {
  const parts = nom.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  return parts
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

// --- avatar --------------------------------------------------------------------

/** Round initials chip with the player accent and a presence dot. */
export function PlayerAvatar({
  nom,
  online,
  size = 42,
}: {
  nom: string;
  online: boolean;
  size?: number;
}) {
  const theme = useProphecyTheme();
  const accent = playerAccent(nom);
  const dot = Math.max(9, Math.round(size * 0.26));
  return (
    <View style={{ width: size, height: size }}>
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: `${accent}22`,
          borderWidth: 1.5,
          borderColor: accent,
        }}>
        <Text style={{ fontFamily: 'Cinzel_600SemiBold', fontSize: size * 0.34, color: accent }}>
          {initials(nom)}
        </Text>
      </View>
      <View
        style={{
          position: 'absolute',
          bottom: -1,
          right: -1,
          width: dot,
          height: dot,
          borderRadius: dot / 2,
          borderWidth: 2,
          borderColor: theme.colors.surface,
          backgroundColor: online ? theme.colors.primary : theme.colors.outline,
        }}
      />
    </View>
  );
}

// --- presence pill -------------------------------------------------------------

/** Presence badge — replaces the design's HP-derived status pill (wounds dropped). */
export function StatusPill({ online }: { online: boolean }) {
  const theme = useProphecyTheme();
  const color = online ? theme.colors.primary : theme.colors.onSurfaceVariant;
  return (
    <View
      style={{
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 999,
        backgroundColor: online ? `${theme.colors.primary}22` : theme.colors.surfaceVariant,
      }}>
      <Text style={{ fontSize: 10, fontWeight: '700', color }}>
        {online ? 'En ligne' : 'Hors ligne'}
      </Text>
    </View>
  );
}

/** Ownership badge — marks entries the GM shared themselves (their PNJ). */
export function OwnerBadge() {
  const theme = useProphecyTheme();
  return (
    <View
      style={{
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 999,
        backgroundColor: `${theme.colors.secondary}22`,
      }}>
      <Text style={{ fontSize: 10, fontWeight: '700', color: theme.colors.secondary }}>PNJ</Text>
    </View>
  );
}

// --- stat tiles ----------------------------------------------------------------

/** Attribut tile: value over label with a coloured top edge. */
export function AttrTile({ label, value, color }: { label: string; value: number; color: string }) {
  const theme = useProphecyTheme();
  return (
    <View
      style={[
        styles.tile,
        {
          backgroundColor: theme.colors.surfaceVariant,
          borderColor: theme.prophecy.borderSoft,
          borderTopColor: color,
          borderTopWidth: 2,
        },
      ]}>
      <Text style={{ fontFamily: 'Cinzel_600SemiBold', fontSize: 18, color }}>{value}</Text>
      <Text style={{ fontSize: 8.5, letterSpacing: 0.4, color: theme.colors.onSurfaceVariant }}>
        {label}
      </Text>
    </View>
  );
}

/** Caractéristique tile: abbr over value, plain surface. */
export function CaracTile({ label, value }: { label: string; value: number }) {
  const theme = useProphecyTheme();
  return (
    <View
      style={[
        styles.tile,
        { backgroundColor: theme.colors.surfaceVariant, borderColor: theme.prophecy.borderSoft },
      ]}>
      <Text
        style={{ fontSize: 8.5, fontWeight: '700', letterSpacing: 0.5, color: theme.colors.onSurfaceVariant }}>
        {label}
      </Text>
      <Text
        style={{ fontFamily: 'Cinzel_600SemiBold', fontSize: 14, color: theme.colors.onSurface }}>
        {value}
      </Text>
    </View>
  );
}

// --- tendance ring -------------------------------------------------------------

/**
 * Radial tendance dial. The ten dots fill from the 0–10 "Sub" value (`fill`);
 * the big centre number is the main tendance `value`. Trig mirrors the design's
 * `radial()` helper (start at −90°, 36° apart).
 */
export function TendanceRing({
  value,
  fill,
  color,
  size = 84,
}: {
  value: number;
  fill: number;
  color: string;
  size?: number;
}) {
  const theme = useProphecyTheme();
  const c = size / 2;
  const r = size * 0.39;
  const dot = size < 72 ? 6.5 : 8;
  return (
    <View style={{ width: size, height: size }}>
      {Array.from({ length: MAX_PUCES }, (_, i) => {
        const ang = ((-90 + i * 36) * Math.PI) / 180;
        const on = i < fill;
        return (
          <View
            key={i}
            style={{
              position: 'absolute',
              width: dot,
              height: dot,
              borderRadius: dot / 2,
              left: c + r * Math.cos(ang) - dot / 2,
              top: c + r * Math.sin(ang) - dot / 2,
              borderWidth: 1.5,
              borderColor: on ? color : theme.colors.outline,
              backgroundColor: on ? color : 'transparent',
            }}
          />
        );
      })}
      <View style={StyleSheet.absoluteFill}>
        <View style={styles.ringCenter}>
          <Text style={{ fontFamily: 'Cinzel_600SemiBold', fontSize: size * 0.26, color }}>
            {value}
          </Text>
        </View>
      </View>
    </View>
  );
}

// --- skill grouping (shared logic) --------------------------------------------

type SharedSkill = {
  name: string;
  attribut: string;
  value: number;
  parentName?: string | null;
  specLabel?: string | null;
};

type SharedEffect = { target?: string; value?: number };

export type SkillGroup = {
  key: string;
  label: string;
  color: string;
  attrVal: number;
  skills: {
    key: string;
    name: string;
    isSpec: boolean;
    value: number;
    bonus: number;
    total: number;
  }[];
};

/**
 * Net active bonus/malus applying to a skill roll: effects targeting `'all'`,
 * the skill's attribut, or that skill by name (`skill:<name>`). Wound malus is
 * NOT included (wounds aren't part of the GM projection / display). Mirrors
 * lib/modifiers `skillModifier` minus the wound term.
 */
function skillBonus(attribut: string, name: string, effects: SharedEffect[]): number {
  const skillKey = skillTarget(name);
  let sum = 0;
  for (const e of effects) {
    if (e.target === 'all' || e.target === attribut || e.target === skillKey) sum += e.value ?? 0;
  }
  return sum;
}

/**
 * Group a character's trained skills by attribut (in the canonical ATTRIBUTS
 * order) and compute the three GM columns per skill:
 *   value  — the raw skill points
 *   bonus  — net active bonus/malus (effects on all / attribut / this skill)
 *   total  — value + attribut value + bonus (the roll base the GM reads off)
 * Optionally filtered by a search query. Specializations (parentName set) render
 * as their own rows labelled by specLabel; effect matching still uses the raw
 * skill name. Empty groups are dropped. Pure — used by both Compagnie screens.
 */
export function groupSkills(
  skills: SharedSkill[],
  attributs: Record<string, number>,
  colors: Record<string, string>,
  query = '',
  effects: SharedEffect[] = [],
): SkillGroup[] {
  const q = query.trim().toLowerCase();
  return ATTRIBUTS.map((a) => {
    const attrVal = attributs[a.key] ?? 0;
    const rows = skills
      .filter((s) => s.attribut === a.key)
      .filter((s) => {
        if (q === '') return true;
        const hay = `${s.name} ${s.specLabel ?? ''} ${s.parentName ?? ''}`.toLowerCase();
        return hay.includes(q);
      })
      .map((s) => {
        const isSpec = !!s.parentName;
        const name = isSpec ? (s.specLabel ?? s.name) : s.name;
        const bonus = skillBonus(a.key, s.name, effects);
        return {
          key: `${s.name}·${s.specLabel ?? ''}`,
          name,
          isSpec,
          value: s.value,
          bonus,
          total: s.value + attrVal + bonus,
        };
      });
    return { key: a.key, label: a.label, color: colors[a.key], attrVal, skills: rows };
  }).filter((g) => g.skills.length > 0);
}

/** Render grouped trained skills (shared by the Compagnie card and detail sheet). */
export function SkillGroupsView({
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
        <SkillRow key={s.key} skill={s} color={g.color} />
      ))}
    </View>
  );
}

/** One skill line: name, then the COMP · MOD · TOT columns. */
function SkillRow({ skill: s, color }: { skill: SkillGroup['skills'][number]; color: string }) {
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

// --- constants re-exports for callers -----------------------------------------

export { ATTRIBUTS, TENDANCES };

const styles = StyleSheet.create({
  tile: {
    flexGrow: 1,
    flexBasis: 0,
    minWidth: 0,
    alignItems: 'center',
    gap: 1,
    paddingVertical: 7,
    borderRadius: 9,
    borderWidth: StyleSheet.hairlineWidth,
  },
  ringCenter: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  groupHeader: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  attrBadge: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 5, paddingHorizontal: 5, paddingVertical: 1 },
  groupDot: { width: 7, height: 7, borderRadius: 2 },
  spacer: { flex: 1 },
  skillRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  skillRowSpec: { paddingLeft: 14 },
  skillVals: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  totalBadge: { borderRadius: 5, paddingHorizontal: 6, paddingVertical: 1, minWidth: 18, alignItems: 'center' },
});
