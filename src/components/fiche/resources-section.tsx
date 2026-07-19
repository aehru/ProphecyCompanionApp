import React from 'react';
import { StyleSheet, View } from 'react-native';
import { IconButton, Text } from 'react-native-paper';

import { dsIcon } from '@/components/ui/icon';
import SectionCard from '@/components/ui/section-card';
import { RESOURCES } from '@/constants/prophecy';

/**
 * RESSOURCES: current / max for each spendable pool (Maîtrise, Chance). Read-only
 * until the tab's edit toggle is on, which adds −1 / +1 and a refill button.
 * `adjust` clamps in the caller (it owns both the sheet max and the live value).
 */
export default function ResourcesSection({
  currentOf,
  maxOf,
  adjust,
  onRefill,
  editing,
}: {
  currentOf: (key: string) => number;
  maxOf: (key: string) => number;
  adjust: (key: string, delta: number) => void;
  onRefill: (key: string) => void;
  editing: boolean;
}) {
  return (
    <SectionCard title="RESSOURCES" icon="potion">
      {RESOURCES.map((r) => {
        const cur = currentOf(`${r.key}Current`);
        const max = maxOf(`${r.key}Max`);
        return (
          <View key={r.key} style={styles.resRow}>
            <Text style={styles.resLabel}>{r.label}</Text>
            {editing ? (
              <IconButton
                icon="minus"
                mode="contained"
                size={16}
                disabled={cur <= 0}
                onPress={() => adjust(r.key, -1)}
              />
            ) : null}
            <Text style={styles.resCount}>
              {cur} / {max}
            </Text>
            {editing ? (
              <>
                <IconButton
                  icon={dsIcon('plus')}
                  mode="contained"
                  size={16}
                  disabled={max > 0 && cur >= max}
                  onPress={() => adjust(r.key, 1)}
                />
                <IconButton icon="refresh" size={16} onPress={() => onRefill(r.key)} />
              </>
            ) : null}
          </View>
        );
      })}
    </SectionCard>
  );
}

const styles = StyleSheet.create({
  resRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  resLabel: { flex: 1, fontSize: 16 },
  resCount: { minWidth: 56, textAlign: 'center', fontSize: 16 },
});
