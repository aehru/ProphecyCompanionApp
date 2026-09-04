// One roster card on the Compagnie screen. The header is constant; the body
// follows the screen's active tab, each body its own component so switching tab
// re-renders one block and the expensive one (grouping the skills) only runs on
// its own tab.

import React, { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Divider, Text } from 'react-native-paper';

import { useAttrColors, useTendColors } from '@/components/campaign/roster-accents';
import { OwnerBadge, PlayerAvatar, StatusPill } from '@/components/campaign/roster-badges';
import SkillGroupsView, { type SkillLineData } from '@/components/campaign/skill-groups-view';
import { AttrTile, CaracTile, TendanceRing } from '@/components/campaign/stat-tiles';
import { ATTRIBUTS, CARACTERISTIQUES, TENDANCES } from '@/constants/prophecy';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';
import type { RosterEntry } from '@/lib/campaign-protocol';
import GlobalModifierRow from '@/components/global-modifier-row';
import { sharedStatRollContext } from '@/lib/campaign-roll';
import { openRoller } from '@/lib/dice-roller';
import { globalModifier, statModifier } from '@/lib/modifiers';
import { skillRollContext } from '@/lib/roll-context';
import type { TableRosterEntry } from '@/lib/roster-merge';
import { groupSkills } from '@/lib/skill-groups';
import { effectsOf, nums, skillsOf, woundOf } from '@/lib/shared-character-view';

type SharedCharacter = RosterEntry['character'];

export default function CompanyCard({
  entry,
  tab,
  query,
  hasNote,
  onOpen,
}: {
  entry: TableRosterEntry;
  /** Index of the screen's active tab (0 stats, 1 skills, 2 tendances). */
  tab: number;
  query: string;
  hasNote: boolean;
  /** Opens the full sheet. Bound to the HEAD only — see below. */
  onOpen: () => void;
}) {
  const theme = useProphecyTheme();
  const c = entry.character;
  const nom = String(c.nom ?? 'Sans nom');

  // The card is NOT one big button any more: its body is made of roll targets
  // (stat tiles, TOT badges), and a press that both rolls and opens the sheet
  // is a press that does the wrong one half the time. The HEAD — avatar, name,
  // badges — is what opens the sheet.
  return (
    <View
      testID={`roster-card-${entry.charId}`}
      style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.prophecy.borderSoft }]}>
      <Pressable
        testID={`roster-open-${entry.charId}`}
        onPress={onOpen}
        accessibilityRole="button"
        accessibilityLabel={`Ouvrir la fiche de ${nom}`}
        style={({ pressed }) => [styles.cardHead, { opacity: pressed ? 0.7 : 1 }]}>
        <PlayerAvatar nom={nom} online={entry.online} size={42} />
        <Text style={{ flex: 1, fontFamily: 'Cinzel_600SemiBold', fontSize: 15, color: theme.colors.onSurface }}>
          {nom}
        </Text>
        {hasNote ? <Text style={{ fontSize: 13 }}>📝</Text> : null}
        {entry.owner === 'gm' ? <OwnerBadge /> : null}
        {/* Presence only means something for a character held by someone else. */}
        {entry.source === 'remote' ? <StatusPill online={entry.online} /> : null}
      </Pressable>

      {tab === 0 ? <StatsBody character={c} /> : null}
      {tab === 1 ? <SkillsBody character={c} query={query} /> : null}
      {tab === 2 ? <TendancesBody character={c} /> : null}
    </View>
  );
}

/** Attributs + caractéristiques tiles, badged with their own effects. */
function StatsBody({ character }: { character: SharedCharacter }) {
  const theme = useProphecyTheme();
  const attrColors = useAttrColors();
  const attr = nums(character.attributs);
  const carac = nums(character.caracteristiques);
  const effects = effectsOf(character.effects);
  // Wounds and 'all' effects hit every roll, so they are read once above the
  // tiles — a roll adds an attribut to a caractéristique and would show them
  // twice. Each tile badges only the effects aimed at that stat.
  const global = globalModifier(effects, woundOf(character.wounds));
  const modOf = (key: string) => statModifier(key, effects);
  // Rolled straight off the projection — the GM does not have to open the sheet
  // to ask for a VOL test, and a player's card rolls the same as a PNJ's: a roll
  // reads the character, it never writes to it.
  const roll = (key: string, kind: 'attribut' | 'caracteristique') =>
    openRoller(sharedStatRollContext(character, key, kind));
  return (
    <View style={styles.statsBody}>
      <GlobalModifierRow modifier={global} compact />
      <View style={styles.tileRow}>
        {ATTRIBUTS.map((a) => (
          <AttrTile
            key={a.key}
            label={a.label}
            value={attr[a.key] ?? 0}
            color={attrColors[a.key]}
            modifier={modOf(a.key)}
            onRoll={() => roll(a.key, 'attribut')}
          />
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
          <CaracTile
            key={k.key}
            label={k.abbr}
            rollLabel={k.label}
            value={carac[k.key] ?? 0}
            modifier={modOf(k.key)}
            onRoll={() => roll(k.key, 'caracteristique')}
          />
        ))}
      </View>
      <View style={styles.tileRow}>
        {CARACTERISTIQUES.slice(4).map((k) => (
          <CaracTile
            key={k.key}
            label={k.abbr}
            rollLabel={k.label}
            value={carac[k.key] ?? 0}
            modifier={modOf(k.key)}
            onRoll={() => roll(k.key, 'caracteristique')}
          />
        ))}
      </View>
    </View>
  );
}

/** Trained skills grouped by attribut, filtered by the screen's search box. */
function SkillsBody({ character, query }: { character: SharedCharacter; query: string }) {
  const attrColors = useAttrColors();
  const skills = useMemo(() => skillsOf(character.skills), [character.skills]);
  const effects = useMemo(() => effectsOf(character.effects), [character.effects]);
  const attr = nums(character.attributs);
  // The wound malus applies to skill rolls too — the TOT column is a roll base.
  const wound = woundOf(character.wounds);
  const groups = useMemo(
    () => groupSkills(skills, attr, attrColors, query, effects, wound),
    [skills, attr, attrColors, query, effects, wound],
  );
  const roll = (skill: SkillLineData) => openRoller(skillRollContext(skill));
  return (
    <SkillGroupsView
      groups={groups}
      emptyLabel="Aucune correspondance."
      compact
      onRoll={roll}
    />
  );
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
