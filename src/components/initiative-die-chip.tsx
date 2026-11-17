import React from 'react';

import type { IconName } from '@/components/ui/icon';
import StatChip from '@/components/ui/stat-chip';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';
import { DIE_USE_SHORT, isLostDie, type DieUsage } from '@/lib/action-cumul';

/**
 * One initiative die as every sheet reads it — the Fiche and the GM's sheet of
 * a character alike: the roll, the wound malus as the badge, the die's mark, a
 * spent die greyed with what it went on, a lost one (wound malus drove it to 0
 * before it was played) bordered in error. An unrolled slot (0) is never lost.
 */
export default function InitiativeDieChip({
  index,
  value,
  wound,
  icon,
  spent,
  onPress,
}: {
  /** 0-based slot, labelled « Dé n ». */
  index: number;
  value: number;
  /** Wound malus, non-positive. */
  wound: number;
  icon?: IconName;
  spent?: DieUsage;
  onPress?: () => void;
}) {
  const theme = useProphecyTheme();
  const lost = value > 0 && isLostDie(value, wound, spent);
  return (
    <StatChip
      label={spent ? `Dé ${index + 1} · ${DIE_USE_SHORT[spent.use]}` : `Dé ${index + 1}`}
      value={String(value)}
      modifier={wound}
      icon={icon}
      onPress={onPress}
      style={[
        lost ? { borderColor: theme.colors.error, borderWidth: 1.5 } : null,
        spent ? { opacity: 0.45 } : null,
      ]}
    />
  );
}
