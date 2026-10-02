import React from 'react';
import { StyleSheet, View } from 'react-native';

import { SectionHeader } from '@/components/ui/section-card';
import type { IconName } from '@/components/ui/icon';

/**
 * A catalogue section whose fold is driven from outside (see `useFolds`) — the
 * `<SectionHeader>` disclosure the trait and spell catalogues draw, with the row
 * count on the header so a folded section still says how much it holds.
 */
export default function FoldSection({
  title,
  icon,
  count,
  open,
  onToggle,
  children,
}: {
  title: string;
  icon?: IconName;
  count?: number;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <SectionHeader
        title={title}
        icon={icon}
        helper={count === undefined ? undefined : String(count)}
        expanded={open}
        onPress={onToggle}
      />
      {open ? children : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: 10 },
});
