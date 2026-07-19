import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

import Bullets from '@/components/bullets';
import SectionCard from '@/components/ui/section-card';
import type { Armor } from '@/db/schema';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';
import { updateArmor } from '@/repositories/armor';

/**
 * ARMURE: the equipped armor's remaining defense, as bullets. Rendered only when
 * a piece is equipped; in edit mode tapping a bullet writes the new current
 * defense straight through (the fiche has no local copy of armor rows).
 */
export default function ArmorSection({ armor, editing }: { armor: Armor; editing: boolean }) {
  const theme = useProphecyTheme();
  return (
    <SectionCard title="ARMURE" icon="shield">
      <View style={styles.healthRow}>
        <Text style={[styles.healthLabel, { color: theme.colors.onSurfaceVariant }]}>
          {armor.name || 'Armure'}
        </Text>
        <Bullets
          count={armor.defenseMax}
          filled={armor.defenseCurrent}
          color={editing ? theme.colors.primary : theme.colors.onSurfaceVariant}
          size={14}
          gap={4}
          perRow={5}
          style={styles.healthDots}
          onSet={editing ? (n) => updateArmor(armor.id, { defenseCurrent: n }) : undefined}
        />
      </View>
    </SectionCard>
  );
}

const styles = StyleSheet.create({
  healthRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  healthLabel: { fontSize: 15 },
  healthDots: { flexShrink: 1, justifyContent: 'flex-end' },
});
