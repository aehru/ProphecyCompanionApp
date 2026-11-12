import React, { useMemo, useState } from 'react';
import { FlatList, type GestureResponderEvent, Pressable, StyleSheet, View } from 'react-native';
import { Button, Divider, IconButton, Menu, Text } from 'react-native-paper';

import { OwnerBadge, PlayerAvatar } from '@/components/campaign/roster-badges';
import { asDieIcon } from '@/components/ui/die-icons';
import DsDialog from '@/components/ui/ds-dialog';
import StatChip from '@/components/ui/stat-chip';
import { contentWidth } from '@/hooks/use-layout';
import { useLocalDieIcons } from '@/hooks/use-local-die-icons';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';
import type { RosterEntry } from '@/lib/campaign-protocol';
import { DIE_USE_LABEL, type DieUse } from '@/lib/action-cumul';
import { initiativeOrder, type InitiativeInput, type InitiativeRow } from '@/lib/initiative-order';
import { markInitiativeDie } from '@/repositories/characters';
import { detachWrite } from '@/repositories/log';

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
 *
 * The same menu spends a GM-owned die: Attaque / Autre mark the die pressed,
 * Défense asks WHICH of that character's remaining dice pays for it (normally a
 * lower one). A spent die stays at the value it was spent at, greyed, so a
 * wound taken afterwards can't resurface it further down. A player's dice are
 * marked on their own Fiche and arrive with the projection.
 */
export default function InitiativeList({
  roster,
  round,
  bottomInset,
  onSelect,
  onRemove,
}: {
  roster: RosterEntry[];
  /** The table's combat turn, 0 before the first « Nouveau tour ». */
  round: number;
  bottomInset: number;
  onSelect: (entry: RosterEntry) => void;
  onRemove: (entry: RosterEntry) => void;
}) {
  const theme = useProphecyTheme();

  // The projection is opaque by design (tolerant reader) — narrow it here.
  const { rows, unrolled, currentCount } = useMemo(() => {
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
  // `row` is set on a die row (it can be spent), absent on a « waiting » row.
  const [menu, setMenu] = useState<{
    entry: RosterEntry;
    row?: InitiativeRow;
    x: number;
    y: number;
  } | null>(null);
  // The dice a défense may be paid with, while the picker is open.
  const [defending, setDefending] = useState<InitiativeRow[] | null>(null);
  // Undefined for a player's row on purpose: a handler that did nothing would
  // still swallow the tap that ends a long hold, and that tap opens the sheet.
  const holdFor = (row: { charId: string; owner?: string }, die?: InitiativeRow) =>
    row.owner === 'gm'
      ? (e: GestureResponderEvent) => {
          const entry = byId.get(row.charId);
          if (entry) setMenu({ entry, row: die, x: e.nativeEvent.pageX, y: e.nativeEvent.pageY });
        }
      : undefined;
  const spend = (row: InitiativeRow, use: DieUse | null, at: number) =>
    detachWrite('actual_state', markInitiativeDie(row.charId, row.dieIndex, use, at), {
      phase: 'initiative-use',
    });
  // Always asked: a défense lists every die of that character still to play
  // at or below the count, and the GM picks.
  const askDefence = (row: InitiativeRow) =>
    setDefending(
      rows.filter(
        (r) =>
          r.charId === row.charId &&
          !r.used &&
          !r.unusable &&
          (currentCount == null || r.effective <= currentCount),
      ),
    );

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
      {rows.length > 0 ? (
        // Pinned above the list, not its header: the GM scrolls the order all
        // fight long and must keep seeing where the table is.
        <Text
          variant="labelLarge"
          style={[styles.header, contentWidth, { color: theme.colors.primary }]}>
          {[
            round > 0 ? `Tour ${round}` : null,
            currentCount != null ? `Initiative ${currentCount}` : 'Tour terminé',
          ]
            .filter(Boolean)
            .join(' · ')}
        </Text>
      ) : null}
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
            current={!item.used && !item.unusable && item.rankValue === currentCount}
            // `dieIndex` indexes the projection's values, which is the very array
            // the local icons are aligned with — same order, same source row.
            icon={dieIcons.get(item.charId)?.[item.dieIndex]}
            onPress={() => open(item.charId)}
            onLongPress={holdFor(item, item)}
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
          ) : undefined
        }
      />
      <Menu
        visible={menu !== null}
        onDismiss={() => setMenu(null)}
        anchor={{ x: menu?.x ?? 0, y: menu?.y ?? 0 }}>
        {menu?.row && !menu.row.used && !menu.row.unusable
          ? (['atk', 'other'] as const).map((use) => (
              <Menu.Item
                key={use}
                title={DIE_USE_LABEL[use]}
                onPress={() => {
                  if (menu.row) spend(menu.row, use, menu.row.effective);
                  setMenu(null);
                }}
              />
            ))
          : null}
        {menu?.row && !menu.row.unusable ? (
          // A défense is paid with any remaining die, so it is offered even on
          // a spent row: it opens the picker for the CHARACTER.
          <Menu.Item
            title="Défense…"
            onPress={() => {
              if (menu.row) askDefence(menu.row);
              setMenu(null);
            }}
          />
        ) : null}
        {menu?.row?.used ? (
          <Menu.Item
            leadingIcon="undo"
            title="Libérer le dé"
            onPress={() => {
              if (menu.row) spend(menu.row, null, 0);
              setMenu(null);
            }}
          />
        ) : null}
        {menu?.row ? <Divider /> : null}
        <Menu.Item
          leadingIcon="account-remove"
          title="Retirer de la table"
          onPress={() => {
            if (menu) onRemove(menu.entry);
            setMenu(null);
          }}
        />
      </Menu>
      <DefenceDialog
        dice={defending}
        onDismiss={() => setDefending(null)}
        onPick={(row) => {
          // Spent AT the count it answered, not at its own value: that is
          // where the table saw it used.
          spend(row, 'def', currentCount ?? row.effective);
          setDefending(null);
        }}
      />
    </>
  );
}

const Separator = () => <View style={styles.separator} />;

/** Which die pays for a défense — asked every time, never guessed. */
function DefenceDialog({
  dice,
  onDismiss,
  onPick,
}: {
  dice: InitiativeRow[] | null;
  onDismiss: () => void;
  onPick: (row: InitiativeRow) => void;
}) {
  const theme = useProphecyTheme();
  return (
    <DsDialog
      visible={dice != null}
      onDismiss={onDismiss}
      title={`Défense de ${dice?.[0]?.nom ?? ''}`}
      dismiss={<Button onPress={onDismiss}>Annuler</Button>}>
      {dice && dice.length > 0 ? (
        <>
          <Text style={{ color: theme.colors.onSurfaceVariant }}>
            Quel dé utiliser ? Il est perdu pour la suite du tour.
          </Text>
          <View style={styles.defenceDice}>
            {dice.map((r) => (
              <StatChip
                key={r.dieIndex}
                label={`Dé ${r.dieIndex + 1}/${r.dieCount}`}
                value={String(r.raw)}
                modifier={r.malus}
                onPress={() => onPick(r)}
              />
            ))}
          </View>
        </>
      ) : (
        <Text style={{ color: theme.colors.onSurfaceVariant }}>
          Plus aucun dé disponible pour se défendre ce tour-ci.
        </Text>
      )}
    </DsDialog>
  );
}

function OrderRow({
  row,
  rank,
  current,
  icon,
  onPress,
  onLongPress,
}: {
  row: InitiativeRow;
  rank: number;
  /** The die the table is at right now. */
  current: boolean;
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
        (row.unusable || row.used) && styles.rowUnusable,
        current && { borderColor: theme.colors.primary, borderWidth: 1.5 },
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
        ) : row.used ? (
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
            {`${DIE_USE_LABEL[row.used]} · à ${row.rankValue}`}
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
      {/* The long press's menu, one tap away: the GM spends a die on every
          turn of a fight. Only on rows this device owns. */}
      {onLongPress ? (
        <IconButton
          icon="dots-vertical"
          size={18}
          style={styles.more}
          onPress={onLongPress}
          accessibilityLabel="Actions du dé"
        />
      ) : null}
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
  header: { paddingHorizontal: 16, paddingTop: 12 },
  more: { margin: 0 },
  defenceDice: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingTop: 8 },
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
