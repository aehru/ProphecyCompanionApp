import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Button, IconButton, Text } from 'react-native-paper';

import Icon, { dsIcon } from '@/components/ui/icon';
import type { Weapon } from '@/db/schema';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';
import { formatDecimal } from '@/lib/character-values';
import { formulaResult, parseFormula, parsePrerequisites } from '@/lib/formula';
import { fmtSignedMod } from '@/lib/modifiers';
import { equipWeapon, unequipWeapon } from '@/repositories/weapons';

type CaracValue = (caracKey: string) => number;
/**
 * Net wound + temporary-effect modifier for a caractéristique. Folded into the
 * carac value before any multiplier in the damage formula.
 */
type CaracModifier = (caracKey: string) => number;

/**
 * One weapon: a read-only summary. The pencil opens the editor in a modal screen
 * (`weapon/[wid]`). Formula fields (damage, ranges) show the raw formula plus its
 * computed result for this character; prerequisites are checked against caracs.
 */
export default function WeaponCard({
  weapon,
  caracValue,
  caracModifier,
  enchanted,
}: {
  weapon: Weapon;
  caracValue: CaracValue;
  caracModifier?: CaracModifier;
  /** This weapon has at least one enchant bound to it (see the Magie tab). */
  enchanted?: boolean;
}) {
  const router = useRouter();
  return (
    <WeaponSummary
      weapon={weapon}
      caracValue={caracValue}
      caracModifier={caracModifier}
      enchanted={enchanted}
      onEdit={() => router.push(`/character/${weapon.characterId}/weapon/${weapon.id}`)}
    />
  );
}

function FormulaRow({
  label,
  raw,
  caracValue,
  // Per-carac modifier (wound + effects), folded into carac values before the
  // multiplier. Only the damage row passes this; ranges ignore combat maluses.
  caracModifier,
}: {
  label: string;
  raw: string | null;
  caracValue: CaracValue;
  caracModifier?: CaracModifier;
}) {
  const theme = useProphecyTheme();
  if (raw == null || raw.trim() === '') return null;
  const result = formulaResult(raw, caracValue, caracModifier);
  // Badge = the raw carac modifier (wound + effects), shown BEFORE any multiplier:
  // a +2 on `FOR x2` reads "+2", not "+4".
  const delta = formulaCaracMod(raw, caracModifier);
  const modColor = delta > 0 ? theme.colors.primary : theme.colors.error;
  return (
    <View style={styles.row}>
      <Text style={[styles.label, { color: theme.colors.onSurfaceVariant }]}>{label}</Text>
      <View style={styles.formulaCol}>
        <Text>{raw.trim()}</Text>
        {result != null && result !== raw.trim() ? (
          <View style={styles.resultRow}>
            <Text style={[styles.result, { color: theme.colors.primary }]}>= {result}</Text>
            {delta !== 0 ? (
              <>
                <IconButton
                  icon="alert-circle"
                  size={14}
                  iconColor={modColor}
                  style={styles.modIcon}
                />
                <Text style={[styles.modNote, { color: modColor }]}>
                  ({fmtSignedMod(delta)})
                </Text>
              </>
            ) : null}
          </View>
        ) : null}
      </View>
    </View>
  );
}

/**
 * Sum of the raw carac modifiers for the distinct caractéristiques a formula
 * uses — the value applied to each carac before its multiplier. For a single-carac
 * formula (the common case) this is just that carac's modifier.
 */
function formulaCaracMod(raw: string, caracModifier?: CaracModifier): number {
  if (!caracModifier) return 0;
  const parsed = parseFormula(raw);
  if (!parsed.ok) return 0;
  const keys = new Set<string>();
  for (const t of parsed.formula.terms) if (t.kind === 'carac') keys.add(t.carac);
  let total = 0;
  for (const k of keys) total += caracModifier(k);
  return total;
}

function WeaponSummary({
  weapon: w,
  caracValue,
  caracModifier,
  enchanted,
  onEdit,
}: {
  weapon: Weapon;
  caracValue: CaracValue;
  caracModifier?: CaracModifier;
  enchanted?: boolean;
  onEdit: () => void;
}) {
  const theme = useProphecyTheme();
  const [expanded, setExpanded] = useState(false);
  const prereqs = parsePrerequisites(w.prerequisites);
  // Any unmet prerequisite flags the weapon's tile with an error border.
  const prereqUnmet = prereqs.some((p) => caracValue(p.carac) < p.min);

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
        <View style={styles.detail}>
          <FormulaRow
            label="Dégâts"
            raw={w.damage}
            caracValue={caracValue}
            caracModifier={caracModifier}
          />

          {prereqs.length > 0 ? (
            <View style={styles.row}>
              <Text style={[styles.label, { color: theme.colors.onSurfaceVariant }]}>Prérequis</Text>
              <View style={styles.prereqWrap}>
                {prereqs.map((p) => {
                  const met = caracValue(p.carac) >= p.min;
                  return (
                    <Text
                      key={p.carac}
                      style={[
                        styles.prereq,
                        { color: met ? theme.colors.primary : theme.colors.error },
                      ]}>
                      {p.abbr} {p.min}
                    </Text>
                  );
                })}
              </View>
            </View>
          ) : null}

          <FormulaRow label="Portée eff." raw={w.rangeEffective} caracValue={caracValue} />
          <FormulaRow label="Portée max" raw={w.rangeMax} caracValue={caracValue} />

          <View style={styles.row}>
            <Text style={[styles.label, { color: theme.colors.onSurfaceVariant }]}>Initiative</Text>
            <Text style={styles.value}>
              Mêlée {fmtSigned(w.initMelee)} · CàC {fmtSigned(w.initCorpsACorps)}
            </Text>
          </View>

          <View style={styles.row}>
            <Text style={[styles.label, { color: theme.colors.onSurfaceVariant }]}>Création</Text>
            <Text style={styles.value}>
              Diff. {w.creationDifficulty} · Temps {formatDecimal(w.creationTime)}
            </Text>
          </View>

          {w.special.trim() !== '' ? (
            <View style={styles.row}>
              <Text style={[styles.label, { color: theme.colors.onSurfaceVariant }]}>Spécial</Text>
              <Text style={styles.value}>{w.special.trim()}</Text>
            </View>
          ) : null}

          <View style={styles.row}>
            <Text style={[styles.label, { color: theme.colors.onSurfaceVariant }]}>Équiper</Text>
            <View style={styles.equipBtns}>
              <Button
                compact
                mode={w.equippedHand === 'main' ? 'contained-tonal' : 'outlined'}
                onPress={() => toggleHand('main')}>
                Main
              </Button>
              <Button
                compact
                mode={w.equippedHand === 'off' ? 'contained-tonal' : 'outlined'}
                onPress={() => toggleHand('off')}>
                Main sec.
              </Button>
              {/* Two-handed only: a 1H weapon is never wielded in both hands. */}
              {w.hands === 2 ? (
                <Button
                  compact
                  mode={w.equippedHand === 'both' ? 'contained-tonal' : 'outlined'}
                  onPress={() => toggleHand('both')}>
                  Deux mains
                </Button>
              ) : null}
            </View>
          </View>

          <Button compact icon={dsIcon('edit')} onPress={onEdit} style={styles.detailEdit}>
            Modifier
          </Button>
        </View>
      ) : null}
    </View>
  );
}

function fmtSigned(n: number) {
  return n > 0 ? `+${n}` : String(n);
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
  equipBtns: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  detail: { gap: 8, paddingLeft: 2, paddingBottom: 12 },
  detailEdit: { alignSelf: 'flex-start', marginTop: 2 },
  row: { flexDirection: 'row', gap: 12 },
  label: { width: 92, fontSize: 14 },
  value: { flex: 1, fontSize: 15 },
  formulaCol: { flex: 1 },
  resultRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  result: { fontSize: 15, fontWeight: '700' },
  modIcon: { margin: 0 },
  modNote: { fontSize: 13, fontWeight: '700' },
  prereqWrap: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  prereq: { fontSize: 15, fontWeight: '600' },
});
