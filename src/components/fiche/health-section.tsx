import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

import Bullets from '@/components/bullets';
import SectionCard from '@/components/ui/section-card';
import { WOUND_LEVELS } from '@/constants/prophecy';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';

/**
 * SANTÉ: one row per wound level — label, damage range, the bullets tracking how
 * many boxes are ticked, and the level's roll malus. In edit mode tapping a
 * bullet sets the current count. `maxOf` reads the character sheet, `currentOf`
 * the live actual_state.
 */
export default function HealthSection({
  maxOf,
  currentOf,
  onSet,
  editing,
}: {
  maxOf: (key: string) => number;
  currentOf: (key: string) => number;
  onSet: (key: string, n: number) => void;
  editing: boolean;
}) {
  const theme = useProphecyTheme();
  return (
    <SectionCard title="SANTÉ" icon="heart">
      {WOUND_LEVELS.map((w) => (
        <View key={w.key} style={styles.woundRow}>
          <View style={styles.woundInfo}>
            <Text style={styles.woundLabel}>{w.label}</Text>
            <Text style={{ color: theme.colors.onSurfaceVariant }}>{w.damage}</Text>
          </View>
          <View style={styles.woundBullets}>
            <Bullets
              count={maxOf(`${w.key}Max`)}
              filled={currentOf(`${w.key}Current`)}
              color={editing ? theme.colors.error : theme.colors.onSurfaceVariant}
              size={14}
              gap={4}
              perRow={5}
              onSet={editing ? (n) => onSet(`${w.key}Current`, n) : undefined}
            />
          </View>
          <Text style={[styles.woundMalus, { color: theme.colors.onSurfaceVariant }]}>
            {w.malus ?? ''}
          </Text>
        </View>
      ))}
    </SectionCard>
  );
}

const styles = StyleSheet.create({
  woundRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  woundInfo: { width: 90 },
  woundBullets: { flex: 1, alignItems: 'flex-end' },
  woundLabel: { fontSize: 16 },
  woundMalus: { width: 32, textAlign: 'right', fontSize: 16 },
});
