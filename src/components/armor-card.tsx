import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

import ArmorDetail from '@/components/armor-detail';
import { prerequisitesUnmet, type CaracValue } from '@/components/gear-detail-rows';
import Icon from '@/components/ui/icon';
import type { Armor } from '@/db/schema';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';
import { equipArmor } from '@/repositories/armor';

/**
 * One armor: a read-only summary. The pencil opens the editor in a modal
 * screen (`armor/[aid]`), mirroring WeaponCard. The shield tile equips it
 * (one armor equipped at a time); current defense is also tracked live on the
 * Fiche tab. The expanded body is {@link ArmorDetail}, shared with the armor
 * catalogue's preview.
 */
export default function ArmorCard({
  armor,
  caracValue,
  enchanted,
}: {
  armor: Armor;
  caracValue: CaracValue;
  /** This armor has at least one enchant bound to it (see the Magie tab). */
  enchanted?: boolean;
}) {
  const router = useRouter();
  return (
    <ArmorSummary
      armor={armor}
      caracValue={caracValue}
      enchanted={enchanted}
      onEdit={() => router.push(`/character/${armor.characterId}/armor/${armor.id}`)}
    />
  );
}

function ArmorSummary({
  armor: a,
  caracValue,
  enchanted,
  onEdit,
}: {
  armor: Armor;
  caracValue: CaracValue;
  enchanted?: boolean;
  onEdit: () => void;
}) {
  const theme = useProphecyTheme();
  const [expanded, setExpanded] = useState(false);
  const prereqUnmet = prerequisitesUnmet(a.prerequisites, caracValue);
  const tileColor = a.equipped
    ? theme.colors.primary
    : prereqUnmet
      ? theme.colors.error
      : theme.colors.onSurfaceVariant;

  return (
    <View style={[styles.item, { borderBottomColor: theme.prophecy.borderSoft }]}>
      <Pressable style={styles.itemRow} onPress={() => setExpanded((e) => !e)}>
        {/* Tap the shield tile to equip (one armor equipped at a time). */}
        <Pressable
          onPress={() => equipArmor(a.characterId, a.id)}
          style={[
            styles.tile,
            {
              backgroundColor: theme.colors.surface,
              borderColor: a.equipped
                ? theme.colors.primary
                : prereqUnmet
                  ? theme.colors.error
                  : theme.prophecy.borderSoft,
              borderWidth: !a.equipped && prereqUnmet ? 1.5 : 1,
            },
          ]}>
          <Icon name="shield" size={22} color={tileColor} />
        </Pressable>
        <View style={styles.itemMain}>
          <View style={styles.nameRow}>
            <Text style={styles.itemName} numberOfLines={1}>
              {a.name || 'Armure'}
            </Text>
            {enchanted ? (
              <View accessibilityLabel="Enchantée" style={styles.enchantBadge}>
                <Icon name="magic" size={14} color={theme.colors.primary} />
              </View>
            ) : null}
          </View>
          <View style={styles.subRow}>
            <Text style={[styles.itemSub, { color: theme.colors.onSurfaceVariant }]}>
              {a.category} · Défense {a.defenseCurrent}/{a.defenseMax}
            </Text>
            {a.equipped ? (
              <Text style={[styles.itemSub, { color: theme.colors.primary }]}>· Équipée</Text>
            ) : null}
          </View>
        </View>
        <Icon name={expanded ? 'arrowup' : 'chev'} size={18} color={theme.colors.onSurfaceVariant} />
      </Pressable>

      {expanded ? <ArmorDetail armor={a} caracValue={caracValue} onEdit={onEdit} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  item: { borderBottomWidth: 1 },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 13, paddingVertical: 12 },
  tile: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemMain: { flex: 1, minWidth: 0 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  itemName: { fontSize: 14, fontWeight: '600', flexShrink: 1 },
  enchantBadge: { alignItems: 'center', justifyContent: 'center' },
  subRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 1 },
  itemSub: { fontSize: 12 },
});
