import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { Redirect, useLocalSearchParams } from 'expo-router';
import React, { useDeferredValue, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Divider, Text, TextInput } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useGmRosterCtx } from '@/components/campaign/gm-roster-provider';
import {
  AttrTile,
  CaracTile,
  groupSkills,
  OwnerBadge,
  PlayerAvatar,
  ServerStatusChip,
  SkillGroupsView,
  StatusPill,
  TendanceRing,
  useAttrColors,
  useTendColors,
} from '@/components/campaign/roster-visuals';
import GmCharacterSheet from '@/components/gm-character-sheet';
import { ATTRIBUTS, CARACTERISTIQUES, TENDANCES } from '@/constants/prophecy';
import type { Campaign } from '@/db/schema';
import { contentWidth } from '@/hooks/use-layout';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';
import type { RosterEntry } from '@/lib/campaign-protocol';
import { campaignQuery, gmNotesQuery, upsertGmNote } from '@/repositories/campaigns';

const TABS = ['Attributs', 'Compétences', 'Tendances'] as const;

// Module-level so FlatList sees the same component type on every render (an
// inline arrow remounts every separator whenever this screen re-renders — and
// with a live roster it re-renders on every player push).
const CardSeparator = () => <View style={styles.separator} />;
const keyExtractor = (e: RosterEntry) => e.charId;

export default function CompagnieScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data } = useLiveQuery(campaignQuery(Number(id)), [id]);
  const campaign = data?.[0];
  if (!campaign) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
      </View>
    );
  }
  // The Compagnie overview is GM-only; a player deep-linking here bounces back.
  if (campaign.role !== 'gm') return <Redirect href={`/campaigns/${campaign.id}`} />;
  return <Compagnie campaign={campaign} />;
}

function Compagnie({ campaign }: { campaign: Campaign }) {
  const theme = useProphecyTheme();
  const insets = useSafeAreaInsets();
  const { status, serverError, roster } = useGmRosterCtx();
  const { data: notes } = useLiveQuery(gmNotesQuery(campaign.id), [campaign.id]);
  const noteByUuid = new Map((notes ?? []).map((n) => [n.charUuid, n.body]));

  const [tab, setTab] = useState(0);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<RosterEntry | null>(null);
  // The search box drives `groupSkills` for EVERY roster card, so filtering a
  // full table is far more work than one keystroke should block on. The input
  // itself stays on `query` (immediate); the cards read the deferred copy, which
  // React re-renders at low priority and abandons when the next key lands.
  const deferredQuery = useDeferredValue(query);
  const stale = query !== deferredQuery;
  // Everything outside `roster` that changes what a row renders.
  const rowState = useMemo(
    () => ({ tab, query: deferredQuery, notes }),
    [tab, deferredQuery, notes],
  );
  // Keep the open sheet live as updates stream in.
  const openEntry = selected ? (roster.find((e) => e.charId === selected.charId) ?? null) : null;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.statusRow}>
        <ServerStatusChip status={status} />
        {serverError ? (
          <Text variant="bodySmall" style={{ color: theme.colors.error }}>
            Erreur serveur : {serverError}
          </Text>
        ) : null}
      </View>

      {/* Tabs drive every card at once. */}
      <View style={[styles.tabs, { borderBottomColor: theme.prophecy.borderSoft }]}>
        {TABS.map((label, i) => {
          const active = tab === i;
          return (
            <Pressable key={label} style={styles.tab} onPress={() => setTab(i)}>
              <Text
                style={{
                  fontFamily: 'Cinzel_600SemiBold',
                  fontSize: 13,
                  color: active ? theme.colors.primary : theme.colors.onSurfaceVariant,
                }}>
                {label}
              </Text>
              <View
                style={[
                  styles.tabInk,
                  { backgroundColor: active ? theme.colors.primary : 'transparent' },
                ]}
              />
            </Pressable>
          );
        })}
      </View>

      {tab === 1 ? (
        <View style={styles.searchWrap}>
          <TextInput
            mode="outlined"
            dense
            value={query}
            onChangeText={setQuery}
            placeholder="Rechercher une compétence…"
            left={<TextInput.Icon icon="magnify" />}
            right={query ? <TextInput.Icon icon="close" onPress={() => setQuery('')} /> : undefined}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>
      ) : null}

      {roster.length === 0 ? (
        <View style={styles.centered}>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center', paddingHorizontal: 32 }}>
            Aucun personnage partagé pour l’instant.
          </Text>
        </View>
      ) : (
        <FlatList
          data={roster}
          keyExtractor={keyExtractor}
          // flex: 1 claims the remaining height (like the salon's ScrollView);
          // the bottom inset keeps the last card clear of the gesture area.
          style={[styles.listFill, stale ? styles.listStale : null]}
          contentContainerStyle={[styles.list, { paddingBottom: 16 + insets.bottom }, contentWidth]}
          ItemSeparatorComponent={CardSeparator}
          // Cards are tall (rings / skill groups): render a screenful, not the
          // whole table, and drop off-screen rows on Android.
          initialNumToRender={4}
          maxToRenderPerBatch={4}
          windowSize={5}
          removeClippedSubviews
          // A roster push leaves `roster` a new array, but switching tab or typing
          // in the search box does not — tell the list those affect every row.
          extraData={rowState}
          renderItem={({ item }) => (
            <CompanyCard
              entry={item}
              tab={tab}
              query={deferredQuery}
              hasNote={noteByUuid.has(item.charId)}
              onPress={() => setSelected(item)}
            />
          )}
        />
      )}

      <GmCharacterSheet
        entry={openEntry}
        note={openEntry ? (noteByUuid.get(openEntry.charId) ?? '') : ''}
        onSaveNote={(charUuid, body) => upsertGmNote(campaign.id, charUuid, body)}
        onDismiss={() => setSelected(null)}
      />
    </View>
  );
}

// --- one player card, body follows the active tab -------------------------------

type NumRecord = Record<string, number>;
const nums = (v: unknown): NumRecord => (v ?? {}) as NumRecord;

function CompanyCard({
  entry,
  tab,
  query,
  hasNote,
  onPress,
}: {
  entry: RosterEntry;
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
        <StatusPill online={entry.online} />
      </View>

      {/* One body per tab, each its own component: the hidden two cost nothing,
          and grouping the skills (the expensive part) only happens on its tab. */}
      {tab === 0 ? <StatsBody character={c} /> : null}
      {tab === 1 ? <SkillsBody character={c} query={query} /> : null}
      {tab === 2 ? <TendancesBody character={c} /> : null}
    </Pressable>
  );
}

type SharedCharacter = RosterEntry['character'];

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

/** Trained skills grouped by attribut, filtered by the shared search box. */
function SkillsBody({ character, query }: { character: SharedCharacter; query: string }) {
  const attrColors = useAttrColors();
  const skills = useMemo(
    () => (Array.isArray(character.skills) ? (character.skills as Parameters<typeof groupSkills>[0]) : []),
    [character.skills],
  );
  const effects = useMemo(
    () => (Array.isArray(character.effects) ? (character.effects as Parameters<typeof groupSkills>[4]) : []),
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
  container: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: 12, flexWrap: 'wrap' },
  tabs: { flexDirection: 'row', marginTop: 12, marginHorizontal: 16, borderBottomWidth: StyleSheet.hairlineWidth },
  tab: { flex: 1, alignItems: 'center', paddingTop: 10, gap: 8 },
  tabInk: { height: 2, alignSelf: 'stretch', borderRadius: 2 },
  searchWrap: { paddingHorizontal: 16, paddingTop: 12 },
  listFill: { flex: 1 },
  // Cards still showing results for an older query — dim them slightly rather
  // than blanking the list while the deferred re-filter catches up.
  listStale: { opacity: 0.6 },
  list: { padding: 16 },
  separator: { height: 12 },
  card: { borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, padding: 14, gap: 13 },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  tileRow: { flexDirection: 'row', gap: 6 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tendRow: { flexDirection: 'row', justifyContent: 'space-around', gap: 6, paddingTop: 4 },
  tendCell: { alignItems: 'center', gap: 7 },
  statsBody: { gap: 10 },
});
