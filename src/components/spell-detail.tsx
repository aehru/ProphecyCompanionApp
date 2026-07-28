import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Text } from 'react-native-paper';

import { dsIcon } from '@/components/ui/icon';
import { CLE_PARFAITE_BONUS, EFFECT_UNIT_LABEL, SPHERE_LABEL } from '@/constants/prophecy';
import type { Spell } from '@/db/schema';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';

/**
 * Read-only spell detail rows — extracted out of SpellCard's own expand so
 * anything that links to a spell (e.g. an enchant's "voir le sort") can embed
 * the same view inline, without a popup/modal. Pass `onEdit` to add a
 * "Modifier" button (SpellCard does); omit it for a pure view.
 */
export default function SpellDetail({ spell: s, onEdit }: { spell: Spell; onEdit?: () => void }) {
  // A crafted clé parfaite makes the spell easier to cast: the roll gains
  // CLE_PARFAITE_BONUS, which reads here as that much off the difficulty.
  const difficulty = s.cleParfaite
    ? `${s.difficulty - CLE_PARFAITE_BONUS} (base ${s.difficulty})`
    : String(s.difficulty);

  return (
    <View style={styles.detail}>
      <DetailRow label="Niveau" value={String(s.level)} />
      <DetailRow label="Complexité" value={String(s.complexity)} />
      <DetailRow label="Sphère" value={SPHERE_LABEL[s.sphere] ?? s.sphere} />
      <DetailRow label="Coût" value={String(s.cost)} />
      <DetailRow
        label="Incantation"
        value={`${s.castTimeAmount} ${EFFECT_UNIT_LABEL[s.castTimeUnit] ?? s.castTimeUnit}`}
      />
      <DetailRow label="Difficulté" value={difficulty} />
      {s.cle.trim() !== '' ? <DetailRow label="Clé" value={s.cle.trim()} /> : null}
      {s.effect.trim() !== '' ? <DetailRow label="Effet" value={s.effect.trim()} /> : null}

      {onEdit ? (
        <Button compact icon={dsIcon('edit')} onPress={onEdit} style={styles.detailEdit}>
          Modifier
        </Button>
      ) : null}
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
});
