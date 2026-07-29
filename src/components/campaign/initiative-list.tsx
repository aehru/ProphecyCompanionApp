import React, { useMemo } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

import { OwnerBadge, PlayerAvatar, StatusPill } from '@/components/campaign/roster-visuals';
import StatChip from '@/components/ui/stat-chip';
import { contentWidth } from '@/hooks/use-layout';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';
import type { RosterEntry } from '@/lib/campaign-protocol';
import { initiativeOrder, type InitiativeInput, type InitiativeRow } from '@/lib/initiative-order';

/**
 * The turn order for the whole table: every rolled die from every roster
 * character, ranked. A character with three dice acts three times and so
 * appears three times — that's the Prophecy rule, not a display quirk.
 *
 * Tapping any row opens that character's sheet, which is where a PNJ's wounds
 * get marked off mid-fight.
 */
export default function InitiativeList({
  roster,
  bottomInset,
  onSelect,
}: {
  roster: RosterEntry[];
  bottomInset: number;
  onSelect: (entry: RosterEntry) => void;
}) {
  const theme = useProphecyTheme();

  // The projection is opaque by design (tolerant reader) — narrow it here.
  const { rows, unrolled } = useMemo(() => {
    const inputs: InitiativeInput[] = roster.map((e) => ({
      charId: e.charId,
      nom: String(e.character.nom ?? 'Sans nom'),
      online: e.online,
      owner: e.owner,
      wounds: (e.character.wounds ?? {}) as InitiativeInput['wounds'],
      initiative: (e.character.initiative ?? {}) as InitiativeInput['initiative'],
    }));
    return initiativeOrder(inputs);
  }, [roster]);

  const byId = useMemo(() => new Map(roster.map((e) => [e.charId, e])), [roster]);
  const open = (charId: string) => {
    const entry = byId.get(charId);
    if (entry) onSelect(entry);
  };

  if (rows.length === 0 && unrolled.length === 0) {
    return (
      <View style={styles.centered}>
        <Text variant="bodyMedium" style={[styles.empty, { color: theme.colors.onSurfaceVariant }]}>
          Aucun personnage partagé pour l’instant.
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={rows}
      keyExtractor={(r) => `${r.charId}-${r.dieIndex}`}
      style={styles.fill}
      contentContainerStyle={[styles.list, { paddingBottom: 16 + bottomInset }, contentWidth]}
      ItemSeparatorComponent={Separator}
      renderItem={({ item, index }) => (
        <OrderRow row={item} rank={index + 1} onPress={() => open(item.charId)} />
      )}
      ListEmptyComponent={
        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
          Personne n’a encore lancé son initiative.
        </Text>
      }
      ListFooterComponent={
        unrolled.length > 0 ? (
          <View style={styles.footer}>
            <Text variant="labelLarge" style={{ color: theme.colors.primary }}>
              En attente du jet
            </Text>
            {unrolled.map((e) => (
              <Pressable
                key={e.charId}
                onPress={() => open(e.charId)}
                style={[styles.waitRow, { borderColor: theme.prophecy.borderSoft }]}>
                <PlayerAvatar nom={e.nom} online={e.online} size={30} />
                <Text style={{ flex: 1, color: theme.colors.onSurface }} numberOfLines={1}>
                  {e.nom}
                </Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  {`${e.initiative?.max ?? 0} dé(s)`}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : null
      }
    />
  );
}

const Separator = () => <View style={styles.separator} />;

function OrderRow({
  row,
  rank,
  onPress,
}: {
  row: InitiativeRow;
  rank: number;
  onPress: () => void;
}) {
  const theme = useProphecyTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.row,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.prophecy.borderSoft,
        },
        // A die driven to 0 or below buys no action; dim the row rather than
        // hiding it, so the GM can see why someone acts less often.
        row.unusable && styles.rowUnusable,
      ]}>
      <Text style={[styles.rank, { color: theme.colors.onSurfaceVariant }]}>{rank}</Text>
      <PlayerAvatar nom={row.nom} online={row.online} size={34} />
      <View style={styles.name}>
        <Text style={{ fontFamily: 'Cinzel_600SemiBold', color: theme.colors.onSurface }} numberOfLines={1}>
          {row.nom}
        </Text>
        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
          {row.unusable ? `Dé ${row.dieIndex + 1} · inutilisable` : `Dé ${row.dieIndex + 1}`}
        </Text>
      </View>
      {row.owner === 'gm' ? <OwnerBadge /> : null}
      <StatusPill online={row.online} />
      <StatChip
        label={`= ${row.effective}`}
        value={String(row.raw)}
        modifier={row.malus}
        style={row.unusable ? { borderColor: theme.colors.error, borderWidth: 1.5 } : undefined}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  list: { padding: 16 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { textAlign: 'center', paddingHorizontal: 32 },
  separator: { height: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  rowUnusable: { opacity: 0.55 },
  rank: { minWidth: 20, textAlign: 'center', fontFamily: 'Cinzel_600SemiBold', fontSize: 15 },
  name: { flex: 1 },
  footer: { gap: 8, paddingTop: 20 },
  waitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
