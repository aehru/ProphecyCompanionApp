import React, { useMemo, useState } from 'react';
import { FlatList, type GestureResponderEvent, Pressable, StyleSheet, View } from 'react-native';
import { Menu, Text } from 'react-native-paper';

import { OwnerBadge, PlayerAvatar } from '@/components/campaign/roster-badges';
import { asDieIcon } from '@/components/ui/die-icons';
import StatChip from '@/components/ui/stat-chip';
import { contentWidth } from '@/hooks/use-layout';
import { useLocalDieIcons } from '@/hooks/use-local-die-icons';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';
import type { RosterEntry } from '@/lib/campaign-protocol';
import { initiativeOrder, type InitiativeInput, type InitiativeRow } from '@/lib/initiative-order';

/**
 * The turn order for the whole table: every rolled die from every roster
 * character, ranked. A character with three dice acts three times and so
 * appears three times — that's the Prophecy rule, not a display quirk.
 *
 * Tapping any row opens that character's sheet, which is where a PNJ's wounds
 * get marked off mid-fight. Long-pressing a row the GM owns (a PNJ, or a PJ
 * held on this device) offers to take it off the table — a dead garde's dice
 * otherwise keep cluttering the order. A player's character has no menu: it
 * is their projection, not the GM's row.
 */
export default function InitiativeList({
  roster,
  bottomInset,
  onSelect,
  onRemove,
}: {
  roster: RosterEntry[];
  bottomInset: number;
  onSelect: (entry: RosterEntry) => void;
  onRemove: (entry: RosterEntry) => void;
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

  // Die marks are local-only, so they come from this device's rows rather than
  // the roster: the GM's own PNJs carry them, a player's character doesn't.
  const dieIcons = useLocalDieIcons();
  const byId = useMemo(() => new Map(roster.map((e) => [e.charId, e])), [roster]);
  const open = (charId: string) => {
    const entry = byId.get(charId);
    if (entry) onSelect(entry);
  };
  // One menu for the whole list, anchored where the finger landed.
  const [menu, setMenu] = useState<{ entry: RosterEntry; x: number; y: number } | null>(null);
  // Undefined for a player's row on purpose: a handler that did nothing would
  // still swallow the tap that ends a long hold, and that tap opens the sheet.
  const holdFor = (row: { charId: string; owner?: string }) =>
    row.owner === 'gm'
      ? (e: GestureResponderEvent) => {
          const entry = byId.get(row.charId);
          if (entry) setMenu({ entry, x: e.nativeEvent.pageX, y: e.nativeEvent.pageY });
        }
      : undefined;

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
    <>
      <FlatList
        data={rows}
        keyExtractor={(r) => `${r.charId}-${r.dieIndex}`}
        style={styles.fill}
        contentContainerStyle={[styles.list, { paddingBottom: 16 + bottomInset }, contentWidth]}
        ItemSeparatorComponent={Separator}
        renderItem={({ item, index }) => (
          <OrderRow
            row={item}
            rank={index + 1}
            // `dieIndex` indexes the projection's values, which is the very array
            // the local icons are aligned with — same order, same source row.
            icon={dieIcons.get(item.charId)?.[item.dieIndex]}
            onPress={() => open(item.charId)}
            onLongPress={holdFor(item)}
          />
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
                  onLongPress={holdFor(e)}
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
      <Menu
        visible={menu !== null}
        onDismiss={() => setMenu(null)}
        anchor={{ x: menu?.x ?? 0, y: menu?.y ?? 0 }}>
        <Menu.Item
          leadingIcon="account-remove"
          title="Retirer de la table"
          onPress={() => {
            if (menu) onRemove(menu.entry);
            setMenu(null);
          }}
        />
      </Menu>
    </>
  );
}

const Separator = () => <View style={styles.separator} />;

function OrderRow({
  row,
  rank,
  icon,
  onPress,
  onLongPress,
}: {
  row: InitiativeRow;
  rank: number;
  /** Local die mark, if this character lives on this device. */
  icon?: string;
  onPress: () => void;
  onLongPress?: (e: GestureResponderEvent) => void;
}) {
  const theme = useProphecyTheme();
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
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
        {row.unusable ? (
          <Text variant="bodySmall" style={{ color: theme.colors.error }}>
            Inutilisable
          </Text>
        ) : null}
      </View>
      {/* Presence is the avatar's dot — a pill here cost the name its width. */}
      {row.owner === 'gm' ? <OwnerBadge /> : null}
      {/* Same reading as every other initiative display: the roll is the value,
          the wound malus is the badge. The rank column already conveys order. */}
      {/* "Dé 2/3": the list ranks every character's dice together, so the index
          alone doesn't say how many actions this one still has coming. */}
      <StatChip
        label={`Dé ${row.dieIndex + 1}/${row.dieCount}`}
        value={String(row.raw)}
        modifier={row.malus}
        icon={asDieIcon(icon)}
        style={[
          styles.orderChip,
          row.unusable ? { borderColor: theme.colors.error, borderWidth: 1.5 } : null,
        ]}
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
  // "Dé 2/3" plus a possible mark needs more room than the chip's 64dp default,
  // or adjustsFontSizeToFit shrinks the label past reading size.
  orderChip: { minWidth: 76 },
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
