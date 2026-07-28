import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

import Bullets from '@/components/bullets';
import SectionCard from '@/components/ui/section-card';
import type { Shield } from '@/db/schema';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';
import { updateShield } from '@/repositories/shields';

/**
 * BOUCLIER: the equipped shield's remaining defense, as bullets. Mirrors
 * ArmorSection — rendered only when a shield is equipped; in edit mode
 * tapping a bullet writes the new current defense straight through.
 */
export default function ShieldSection({ shield, editing }: { shield: Shield; editing: boolean }) {
  const theme = useProphecyTheme();
  return (
    <SectionCard title="BOUCLIER" icon="shield">
      <View style={styles.healthRow}>
        <Text style={[styles.healthLabel, { color: theme.colors.onSurfaceVariant }]}>
          {shield.name || 'Bouclier'}
        </Text>
        <Bullets
          count={shield.defenseMax}
          filled={shield.defenseCurrent}
          color={editing ? theme.colors.primary : theme.colors.onSurfaceVariant}
          size={14}
          gap={4}
          perRow={5}
          style={styles.healthDots}
          onSet={editing ? (n) => updateShield(shield.id, { defenseCurrent: n }) : undefined}
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
