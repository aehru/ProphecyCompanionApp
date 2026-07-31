// One roster card on the Compagnie screen. The header is constant; the body
// follows the screen's active tab, each body its own component so switching tab
// re-renders one block and the expensive one (grouping the skills) only runs on
// its own tab.

import React, { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Divider, Text } from 'react-native-paper';

import { useAttrColors, useTendColors } from '@/components/campaign/roster-accents';
import { OwnerBadge, PlayerAvatar, StatusPill } from '@/components/campaign/roster-badges';
import SkillGroupsView from '@/components/campaign/skill-groups-view';
import { AttrTile, CaracTile, TendanceRing } from '@/components/campaign/stat-tiles';
import { ATTRIBUTS, CARACTERISTIQUES, TENDANCES } from '@/constants/prophecy';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';
import type { RosterEntry } from '@/lib/campaign-protocol';
import type { TableRosterEntry } from '@/lib/roster-merge';
import { groupSkills, type SharedEffect, type SharedSkill } from '@/lib/skill-groups';
import { nums } from '@/lib/shared-character-view';

type SharedCharacter = RosterEntry['character'];

export default function CompanyCard({
  entry,
  tab,
  query,
  hasNote,
  onPress,
}: {
  entry: TableRosterEntry;
  /** Index of the screen's active tab (0 stats, 1 skills, 2 tendances). */
  tab: number;
  query: string;
  hasNote: boolean;
  onPress: () => void;
}) {
  const theme = useProphecyTheme();
  const c = entry.character;
  const nom = String(c.nom ?? 'Sans nom');

  return (
    <Pressable
      onPress={onPress}
      style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.prophecy.borderSoft }]}>
      <View style={styles.cardHead}>
        <PlayerAvatar nom={nom} online={entry.online} size={42} />
        <Text style={{ flex: 1, fontFamily: 'Cinzel_600SemiBold', fontSize: 15, color: theme.colors.onSurface }}>
          {nom}
        </Text>
        {hasNote ? <Text style={{ fontSize: 13 }}>📝</Text> : null}
        {entry.owner === 'gm' ? <OwnerBadge /> : null}
        {/* Presence only means something for a character held by someone else. */}
        {entry.source === 'remote' ? <StatusPill online={entry.online} /> : null}
      </View>

      {tab === 0 ? <StatsBody character={c} /> : null}
      {tab === 1 ? <SkillsBody character={c} query={query} /> : null}
      {tab === 2 ? <TendancesBody character={c} /> : null}
    </Pressable>
  );
}

/** Attributs + caractéristiques tiles. */
function StatsBody({ character }: { character: SharedCharacter }) {
  const theme = useProphecyTheme();
  const attrColors = useAttrColors();
  const attr = nums(character.attributs);
  const carac = nums(character.caracteristiques);
  return (
    <View style={styles.statsBody}>
      <View style={styles.tileRow}>
        {ATTRIBUTS.map((a) => (
          <AttrTile key={a.key} label={a.label} value={attr[a.key] ?? 0} color={attrColors[a.key]} />
        ))}
      </View>
      <View style={styles.dividerRow}>
        <Text style={{ fontSize: 9, fontWeight: '700', letterSpacing: 1, color: theme.colors.onSurfaceVariant }}>
          CARACTÉRISTIQUES
        </Text>
        <View style={{ flex: 1 }}>
          <Divider style={{ backgroundColor: theme.prophecy.borderSoft }} />
        </View>
      </View>
      <View style={styles.tileRow}>
        {CARACTERISTIQUES.slice(0, 4).map((k) => (
          <CaracTile key={k.key} label={k.abbr} value={carac[k.key] ?? 0} />
        ))}
      </View>
      <View style={styles.tileRow}>
        {CARACTERISTIQUES.slice(4).map((k) => (
          <CaracTile key={k.key} label={k.abbr} value={carac[k.key] ?? 0} />
        ))}
      </View>
    </View>
  );
}

/** Trained skills grouped by attribut, filtered by the screen's search box. */
function SkillsBody({ character, query }: { character: SharedCharacter; query: string }) {
  const attrColors = useAttrColors();
  const skills = useMemo(
    () => (Array.isArray(character.skills) ? (character.skills as SharedSkill[]) : []),
    [character.skills],
  );
  const effects = useMemo(
    () => (Array.isArray(character.effects) ? (character.effects as SharedEffect[]) : []),
    [character.effects],
  );
  const attr = nums(character.attributs);
  const groups = useMemo(
    () => groupSkills(skills, attr, attrColors, query, effects),
    [skills, attr, attrColors, query, effects],
  );
  return <SkillGroupsView groups={groups} emptyLabel="Aucune correspondance." compact />;
}

/** The three tendance dials. */
function TendancesBody({ character }: { character: SharedCharacter }) {
  const theme = useProphecyTheme();
  const tendColors = useTendColors();
  const tend = nums(character.tendances);
  return (
    <View style={styles.tendRow}>
      {TENDANCES.map((t) => (
        <View key={t.key} style={styles.tendCell}>
          <TendanceRing
            value={tend[t.key] ?? 0}
            fill={tend[`${t.key}Sub`] ?? 0}
            color={tendColors[t.key]}
            size={84}
          />
          <Text style={{ fontSize: 11, fontWeight: '600', color: theme.colors.onSurface }}>
            {t.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, padding: 14, gap: 13 },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  tileRow: { flexDirection: 'row', gap: 6 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tendRow: { flexDirection: 'row', justifyContent: 'space-around', gap: 6, paddingTop: 4 },
  tendCell: { alignItems: 'center', gap: 7 },
  statsBody: { gap: 10 },
});
