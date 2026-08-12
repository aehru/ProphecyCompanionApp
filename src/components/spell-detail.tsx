import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Text } from 'react-native-paper';

import { dsIcon } from '@/components/ui/icon';
import { CLE_PARFAITE_BONUS, EFFECT_UNIT_LABEL, SPHERE_LABEL } from '@/constants/prophecy';
import type { Spell } from '@/db/schema';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';
import { spellTotalBreakdown, type SpellTotal, type SpellTotalInput } from '@/lib/spell-total';

/**
 * The spell fields the detail prints. Every one is optional because the same
 * view renders a **catalogue preset** (`SpellPreset['data']`, whose columns are
 * insert-optional) as well as a saved row.
 */
export type SpellView = Partial<
  Pick<
    Spell,
    | 'level'
    | 'complexity'
    | 'discipline'
    | 'sphere'
    | 'cost'
    | 'castTimeAmount'
    | 'castTimeUnit'
    | 'difficulty'
    | 'cleParfaite'
    | 'cle'
    | 'effect'
  >
>;

/**
 * Read-only spell detail rows — extracted out of SpellCard's own expand so
 * anything that links to a spell (e.g. an enchant's "voir le sort", or the
 * catalogue's preview) can embed the same view inline, without a popup/modal.
 * Pass `onEdit` to add a "Modifier" button (SpellCard does); omit it for a pure
 * view. `total` is the character's casting score (see lib/spell-total); omit it
 * where there is no character in context and the row is skipped.
 */
export default function SpellDetail({
  spell: s,
  total,
  onEdit,
}: {
  spell: SpellView;
  total?: SpellTotal | null;
  onEdit?: () => void;
}) {
  // A crafted clé parfaite makes the spell easier to cast: the roll gains
  // CLE_PARFAITE_BONUS, which reads here as that much off the difficulty.
  const base = s.difficulty ?? 0;
  const difficulty = s.cleParfaite ? `${base - CLE_PARFAITE_BONUS} (base ${base})` : String(base);
  const sphere = s.sphere ?? '';
  const unit = s.castTimeUnit ?? '';
  const cle = (s.cle ?? '').trim();
  const effect = (s.effect ?? '').trim();

  return (
    <View style={styles.detail}>
      <DetailRow label="Niveau" value={String(s.level ?? 0)} />
      <DetailRow label="Complexité" value={String(s.complexity ?? 0)} />
      <DetailRow label="Sphère" value={SPHERE_LABEL[sphere] ?? sphere} />
      <DetailRow label="Coût" value={String(s.cost ?? 0)} />
      <DetailRow
        label="Incantation"
        value={`${s.castTimeAmount ?? 0} ${EFFECT_UNIT_LABEL[unit] ?? unit}`}
      />
      <DetailRow label="Difficulté" value={difficulty} />
      {total ? (
        <TotalRow
          total={total}
          spell={{ discipline: s.discipline ?? '', sphere, cleParfaite: s.cleParfaite }}
        />
      ) : null}
      {cle !== '' ? <DetailRow label="Clé" value={cle} /> : null}
      {effect !== '' ? <DetailRow label="Effet" value={effect} /> : null}

      {onEdit ? (
        <Button compact icon={dsIcon('edit')} onPress={onEdit} style={styles.detailEdit}>
          Modifier
        </Button>
      ) : null}
    </View>
  );
}

/**
 * The casting score, with its terms spelled out underneath — the clé parfaite
 * appears here as a `+5` AND above as a lowered difficulty, which is the same
 * bonus read from either side of the roll.
 */
function TotalRow({ total, spell }: { total: SpellTotal; spell: SpellTotalInput }) {
  const theme = useProphecyTheme();
  return (
    <View style={styles.row}>
      <Text style={[styles.label, { color: theme.colors.onSurfaceVariant }]}>Total</Text>
      <View style={styles.totalCol}>
        <Text style={[styles.totalValue, { color: theme.colors.primary }]}>{total.total}</Text>
        <Text style={[styles.breakdown, { color: theme.colors.onSurfaceVariant }]}>
          {spellTotalBreakdown(total, spell)}
        </Text>
      </View>
    </View>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  const theme = useProphecyTheme();
  return (
    <View style={styles.row}>
      <Text style={[styles.label, { color: theme.colors.onSurfaceVariant }]}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  detail: { gap: 8, paddingLeft: 2, paddingBottom: 12 },
  detailEdit: { alignSelf: 'flex-start', marginTop: 2 },
  row: { flexDirection: 'row', gap: 12 },
  label: { width: 92, fontSize: 14 },
  value: { flex: 1, fontSize: 15 },
  totalCol: { flex: 1 },
  totalValue: { fontSize: 15, fontWeight: '600' },
  breakdown: { fontSize: 12, marginTop: 1 },
});
