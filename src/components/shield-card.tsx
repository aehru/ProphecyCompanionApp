import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Button, IconButton, Text } from 'react-native-paper';

import Icon, { dsIcon } from '@/components/ui/icon';
import type { Shield } from '@/db/schema';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';
import { formatDecimal } from '@/lib/character-values';
import { formulaResult, parseFormula, parsePrerequisites } from '@/lib/formula';
import { fmtSignedMod } from '@/lib/modifiers';
import { equipShield } from '@/repositories/shields';

type CaracValue = (caracKey: string) => number;
type CaracModifier = (caracKey: string) => number;

/**
 * One shield: a read-only summary. The pencil opens the editor in a modal
 * screen (`shield/[sid]`). The damage formula shows like a weapon's; the tile
 * equips it (one shield equipped at a time, independent of armor/weapons).
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

function FormulaRow({
  label,
  raw,
  caracValue,
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
                <IconButton icon="alert-circle" size={14} iconColor={modColor} style={styles.modIcon} />
                <Text style={[styles.modNote, { color: modColor }]}>({fmtSignedMod(delta)})</Text>
              </>
            ) : null}
          </View>
        ) : null}
      </View>
    </View>
  );
}

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
  const prereqs = parsePrerequisites(s.prerequisites);
  const prereqUnmet = prereqs.some((p) => caracValue(p.carac) < p.min);
  const tileColor = s.equipped
    ? theme.colors.primary
    : prereqUnmet
      ? theme.colors.error
      : theme.colors.onSurfaceVariant;

  const dmg = formulaResult(s.damage, caracValue, caracModifier);
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
        <View style={styles.detail}>
          <FormulaRow label="Dégâts" raw={s.damage} caracValue={caracValue} caracModifier={caracModifier} />

          {prereqs.length > 0 ? (
            <View style={styles.row}>
              <Text style={[styles.label, { color: theme.colors.onSurfaceVariant }]}>Prérequis</Text>
              <View style={styles.prereqWrap}>
                {prereqs.map((p) => {
                  const met = caracValue(p.carac) >= p.min;
                  return (
                    <Text
                      key={p.carac}
                      style={[styles.prereq, { color: met ? theme.colors.primary : theme.colors.error }]}>
                      {p.abbr} {p.min}
                    </Text>
                  );
                })}
              </View>
            </View>
          ) : null}

          <View style={styles.row}>
            <Text style={[styles.label, { color: theme.colors.onSurfaceVariant }]}>Défense</Text>
            <Text style={styles.value}>
              {s.defenseCurrent}/{s.defenseMax}
            </Text>
          </View>

          <View style={styles.row}>
            <Text style={[styles.label, { color: theme.colors.onSurfaceVariant }]}>Création</Text>
            <Text style={styles.value}>
              Diff. {s.creationDifficulty} · Temps {formatDecimal(s.creationTime)}
            </Text>
          </View>

          <View style={styles.row}>
            <Text style={[styles.label, { color: theme.colors.onSurfaceVariant }]}>Encombrement</Text>
            <Text style={styles.value}>{s.encombrementMalus}</Text>
          </View>

          {s.special.trim() !== '' ? (
            <View style={styles.row}>
              <Text style={[styles.label, { color: theme.colors.onSurfaceVariant }]}>Spécial</Text>
              <Text style={styles.value}>{s.special.trim()}</Text>
            </View>
          ) : null}

          <Button compact icon={dsIcon('edit')} onPress={onEdit} style={styles.detailEdit}>
            Modifier
          </Button>
        </View>
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
