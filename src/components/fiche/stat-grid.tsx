import React from 'react';
import { StyleSheet, View } from 'react-native';

import SectionCard from '@/components/ui/section-card';
import StatChip from '@/components/ui/stat-chip';
import type { IconName } from '@/components/ui/icon';

/**
 * A titled grid of read-only stat tiles — the shape shared by the fiche's
 * ATTRIBUTS and CARACTÉRISTIQUES sections. `stats` is a static catalogue slice;
 * the two accessors keep this component free of the character record itself, so
 * it only re-renders when a value it actually shows changes.
 */
export default function StatGrid({
  title,
  icon,
  stats,
  valueOf,
  modifierOf,
}: {
  title: string;
  icon?: IconName;
  stats: readonly { key: string; label: string }[];
  valueOf: (key: string) => string;
  modifierOf: (key: string) => number;
}) {
  return (
    <SectionCard title={title} icon={icon}>
      <View style={styles.grid}>
        {stats.map((s) => (
          <StatChip
            key={s.key}
            label={s.label}
            value={valueOf(s.key)}
            modifier={modifierOf(s.key)}
            style={styles.col4}
          />
        ))}
      </View>
    </SectionCard>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  // Grow to fill each row so tiles sit flush to both card edges (no trailing
  // gap on the right). flexBasis keeps the wrap at 4 columns.
  col4: { flexGrow: 1, flexBasis: '22%', minWidth: 0 },
});
