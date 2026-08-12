import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

import {
  prerequisitesUnmet,
  type CaracModifier,
  type CaracValue,
} from '@/components/gear-detail-rows';
import Icon from '@/components/ui/icon';
import WeaponDetail, { fmtSigned } from '@/components/weapon-detail';
import type { Weapon } from '@/db/schema';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';
import { formulaResult } from '@/lib/formula';
import type { WeaponSkillReading } from '@/lib/weapon-skill';
import { equipWeapon, unequipWeapon } from '@/repositories/weapons';

/**
 * One weapon: a read-only summary. The pencil opens the editor in a modal screen
 * (`weapon/[wid]`). The expanded body is {@link WeaponDetail}, shared with the
 * weapon catalogue's preview: formula fields show the raw formula plus its
 * computed result for this character, and prerequisites are checked against caracs.
 */
export default function WeaponCard({
  weapon,
  caracValue,
  caracModifier,
  skill,
  enchanted,
}: {
  weapon: Weapon;
  caracValue: CaracValue;
  caracModifier?: CaracModifier;
  /**
   * The weapon's compétence resolved against this character (see
   * lib/weapon-skill). Computed by the caller — like SpellCard's `total` — so
   * the card stays free of skill/effect lookups and both the Fiche and the GM's
   * NPC sheet read the same number.
   */
  skill?: WeaponSkillReading;
  /** This weapon has at least one enchant bound to it (see the Magie tab). */
  enchanted?: boolean;
}) {
  const router = useRouter();
  return (
    <WeaponSummary
      weapon={weapon}
      caracValue={caracValue}
      caracModifier={caracModifier}
      skill={skill}
      enchanted={enchanted}
      onEdit={() => router.push(`/character/${weapon.characterId}/weapon/${weapon.id}`)}
    />
  );
}

function WeaponSummary({
  weapon: w,
  caracValue,
  caracModifier,
  skill,
  enchanted,
  onEdit,
}: {
  weapon: Weapon;
  caracValue: CaracValue;
  caracModifier?: CaracModifier;
  skill?: WeaponSkillReading;
  enchanted?: boolean;
  onEdit: () => void;
}) {
  const theme = useProphecyTheme();
  const [expanded, setExpanded] = useState(false);
  // Any unmet prerequisite flags the weapon's tile with an error border.
  const prereqUnmet = prerequisitesUnmet(w.prerequisites, caracValue);

  // Equip state. Two-handed weapons occupy 'both'; one-handed toggle 'main'/'off'.
  const equippedLabel =
    w.equippedHand === 'both'
      ? 'Deux mains'
      : w.equippedHand === 'main'
        ? 'Main'
        : w.equippedHand === 'off'
          ? 'Main sec.'
          : null;
  // Toggle a slot: tapping the active one unequips. Any weapon can go in any
  // slot — handedness isn't enforced (an advantage may allow a two-handed weapon
  // in one hand, with a malus applied in play).
  const toggleHand = (hand: 'main' | 'off' | 'both') => {
    if (w.equippedHand === hand) unequipWeapon(w.id);
    else equipWeapon(w.characterId, w.id, hand);
  };

  // Collapsed-row subtitle: computed damage + initiative (mêlée / corps à corps).
  // The full breakdown (formula results, prereqs, ranges, creation) is in the
  // expanded detail.
  const dmg = formulaResult(w.damage, caracValue, caracModifier);
  const subtitle = [
    w.damage.trim() !== '' ? `Dégâts ${dmg ?? w.damage.trim()}` : null,
    `Init ${fmtSigned(w.initMelee)}/${fmtSigned(w.initCorpsACorps)}`,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <View style={[styles.item, { borderBottomColor: theme.prophecy.borderSoft }]}>
      <Pressable style={styles.itemRow} onPress={() => setExpanded((e) => !e)}>
        <View
          style={[
            styles.tile,
            {
              backgroundColor: theme.colors.surface,
              borderColor: prereqUnmet ? theme.colors.error : theme.prophecy.borderSoft,
              borderWidth: prereqUnmet ? 1.5 : 1,
            },
          ]}>
          <Icon name="sword" size={22} color={prereqUnmet ? theme.colors.error : theme.colors.primary} />
        </View>
        <View style={styles.itemMain}>
          <View style={styles.nameRow}>
            <Text style={styles.itemName} numberOfLines={1}>
              {w.name || 'Arme'}
            </Text>
            {enchanted ? (
              <View accessibilityLabel="Enchantée" style={styles.enchantBadge}>
                <Icon name="magic" size={14} color={theme.colors.primary} />
              </View>
            ) : null}
          </View>
          <View style={styles.subRow}>
            {subtitle !== '' ? (
              <Text
                style={[styles.itemSub, { color: theme.colors.onSurfaceVariant }]}
                numberOfLines={1}>
                {subtitle}
              </Text>
            ) : null}
            {/* Collapsed: the attack total alone. The breakdown (which
                compétence, which attribut) is one tap away in the detail. */}
            {skill?.status === 'ok' ? (
              <View style={styles.skillChip}>
                <Text style={[styles.itemSub, { color: theme.colors.onSurfaceVariant }]}>·</Text>
                <Icon name="sword" size={12} color={theme.colors.onSurfaceVariant} />
                <Text style={[styles.itemSub, { color: theme.colors.onSurfaceVariant }]}>
                  {skill.total}
                </Text>
              </View>
            ) : null}
            {equippedLabel ? (
              <Text style={[styles.itemSub, { color: theme.colors.primary }]}>
                · Équipée ({equippedLabel})
              </Text>
            ) : null}
          </View>
        </View>
        <Icon name={expanded ? 'arrowup' : 'chev'} size={18} color={theme.colors.onSurfaceVariant} />
      </Pressable>

      {expanded ? (
        <WeaponDetail
          weapon={w}
          caracValue={caracValue}
          caracModifier={caracModifier}
          skill={skill}
          equip={{ hands: w.hands, equippedHand: w.equippedHand, onToggle: toggleHand }}
          onEdit={onEdit}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  // DS inventory row.
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
  skillChip: { flexDirection: 'row', alignItems: 'center', gap: 2 },
});
