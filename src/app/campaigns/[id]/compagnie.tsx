import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { Redirect, useLocalSearchParams } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Divider, Text, TextInput } from 'react-native-paper';

import { useGmRosterCtx } from '@/components/campaign/gm-roster-provider';
import {
  AttrTile,
  CaracTile,
  groupSkills,
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
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';
import type { RosterEntry } from '@/lib/campaign-protocol';
import { campaignQuery, gmNotesQuery, upsertGmNote } from '@/repositories/campaigns';

const TABS = ['Attributs', 'Compétences', 'Tendances'] as const;

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
  const { status, serverError, roster } = useGmRosterCtx();
  const { data: notes } = useLiveQuery(gmNotesQuery(campaign.id), [campaign.id]);
  const noteByUuid = new Map((notes ?? []).map((n) => [n.charUuid, n.body]));

  const [tab, setTab] = useState(0);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<RosterEntry | null>(null);
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
          keyExtractor={(e) => e.charId}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          renderItem={({ item }) => (
            <CompanyCard
              entry={item}
              tab={tab}
              query={query}
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
  const attrColors = useAttrColors();
  const tendColors = useTendColors();
  const c = entry.character;
  const nom = String(c.nom ?? 'Sans nom');
  const attr = nums(c.attributs);
  const carac = nums(c.caracteristiques);
  const tend = nums(c.tendances);
  const skills = useMemo(
    () => (Array.isArray(c.skills) ? (c.skills as Parameters<typeof groupSkills>[0]) : []),
    [c.skills],
  );
  const effects = useMemo(
    () => (Array.isArray(c.effects) ? (c.effects as Parameters<typeof groupSkills>[4]) : []),
    [c.effects],
  );
  const groups = useMemo(
    () => groupSkills(skills, attr, attrColors, query, effects),
    [skills, attr, attrColors, query, effects],
  );

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
        <StatusPill online={entry.online} />
      </View>

      {tab === 0 ? (
        <View style={{ gap: 10 }}>
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
      ) : null}

      {tab === 1 ? (
        <SkillGroupsView groups={groups} emptyLabel="Aucune correspondance." compact />
      ) : null}

      {tab === 2 ? (
        <View style={styles.tendRow}>
          {TENDANCES.map((t) => (
            <View key={t.key} style={{ alignItems: 'center', gap: 7 }}>
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
      ) : null}
    </Pressable>
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
  list: { padding: 16 },
  card: { borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, padding: 14, gap: 13 },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  tileRow: { flexDirection: 'row', gap: 6 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tendRow: { flexDirection: 'row', justifyContent: 'space-around', gap: 6, paddingTop: 4 },
});
