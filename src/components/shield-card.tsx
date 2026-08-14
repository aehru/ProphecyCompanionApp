import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

import {
  prerequisitesUnmet,
  type CaracModifier,
  type CaracValue,
} from '@/components/gear-detail-rows';
import ShieldDetail from '@/components/shield-detail';
import Icon from '@/components/ui/icon';
import type { Shield } from '@/db/schema';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';
import { formulaResult } from '@/lib/formula';
import { equipShield } from '@/repositories/shields';

/**
 * One shield: a read-only summary. The pencil opens the editor in a modal
 * screen (`shield/[sid]`). The damage formula shows like a weapon's; the tile
 * equips it (one shield equipped at a time, independent of armor/weapons). The
 * expanded body is {@link ShieldDetail}, shared with the shield catalogue's
 * preview.
 */
export default function ShieldCard({
  shield,
  caracValue,
  caracModifier,
  enchanted,
}: {
  shield: Shield;
  caracValue: CaracValue;
  caracModifier?: CaracModifier;
  /** This shield has at least one enchant bound to it (see the Magie tab). */
  enchanted?: boolean;
}) {
  const router = useRouter();
  return (
    <ShieldSummary
      shield={shield}
      caracValue={caracValue}
      caracModifier={caracModifier}
      enchanted={enchanted}
      onEdit={() => router.push(`/character/${shield.characterId}/shield/${shield.id}`)}
    />
  );
}

function ShieldSummary({
  shield: s,
  caracValue,
  caracModifier,
  enchanted,
  onEdit,
}: {
  shield: Shield;
  caracValue: CaracValue;
  caracModifier?: CaracModifier;
  enchanted?: boolean;
  onEdit: () => void;
}) {
  const theme = useProphecyTheme();
  const [expanded, setExpanded] = useState(false);
  const prereqUnmet = prerequisitesUnmet(s.prerequisites, caracValue);
  const tileColor = s.equipped
    ? theme.colors.primary
    : prereqUnmet
      ? theme.colors.error
      : theme.colors.onSurfaceVariant;

  const dmg = formulaResult(s.damage, { carac: caracValue, caracModifier });
  const subtitle = [
    s.damage.trim() !== '' ? `Dégâts ${dmg ?? s.damage.trim()}` : null,
    `Défense ${s.defenseCurrent}/${s.defenseMax}`,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <View style={[styles.item, { borderBottomColor: theme.prophecy.borderSoft }]}>
      <Pressable style={styles.itemRow} onPress={() => setExpanded((e) => !e)}>
        {/* Tap the shield tile to equip (one shield equipped at a time). */}
        <Pressable
          onPress={() => equipShield(s.characterId, s.id)}
          style={[
            styles.tile,
            {
              backgroundColor: theme.colors.surface,
              borderColor: s.equipped
                ? theme.colors.primary
                : prereqUnmet
                  ? theme.colors.error
                  : theme.prophecy.borderSoft,
              borderWidth: !s.equipped && prereqUnmet ? 1.5 : 1,
            },
          ]}>
          <Icon name="shield" size={22} color={tileColor} />
        </Pressable>
        <View style={styles.itemMain}>
          <View style={styles.nameRow}>
            <Text style={styles.itemName} numberOfLines={1}>
              {s.name || 'Bouclier'}
            </Text>
            {enchanted ? (
              <View accessibilityLabel="Enchanté" style={styles.enchantBadge}>
                <Icon name="magic" size={14} color={theme.colors.primary} />
              </View>
            ) : null}
          </View>
          <View style={styles.subRow}>
            {subtitle !== '' ? (
              <Text style={[styles.itemSub, { color: theme.colors.onSurfaceVariant }]} numberOfLines={1}>
                {subtitle}
              </Text>
            ) : null}
            {s.equipped ? (
              <Text style={[styles.itemSub, { color: theme.colors.primary }]}>· Équipé</Text>
            ) : null}
          </View>
        </View>
        <Icon name={expanded ? 'arrowup' : 'chev'} size={18} color={theme.colors.onSurfaceVariant} />
      </Pressable>

      {expanded ? (
        <ShieldDetail
          shield={s}
          caracValue={caracValue}
          caracModifier={caracModifier}
          onEdit={onEdit}
        />
      ) : null}
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
