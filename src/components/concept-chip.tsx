// The concept pill — the free-text half of the identity pair. The neutral
// hairline instead of the caste's gold ring is the ONLY difference between the
// two, since a concept is free text where a caste is a closed set.
//
// Renders NOTHING for an empty concept, like its neighbour.
//
// Geometry lives in `<IdentityChip>`, with the caste's and the Statut's.

import React from 'react';
import { type ViewStyle } from 'react-native';

import IdentityChip, { type ChipTone } from '@/components/ui/identity-chip';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';
import { OVERLAY_INK } from '@/theme/overlayInk';

export default function ConceptChip({
  concept,
  style,
  tone = 'surface',
}: {
  concept?: string | null;
  style?: ViewStyle;
  tone?: ChipTone;
}) {
  const theme = useProphecyTheme();
  if (!concept) return null;
  const overlay = tone === 'overlay';
  return (
    <IdentityChip
      testID="concept-chip"
      label={concept}
      color={overlay ? OVERLAY_INK.textMuted : theme.colors.onSurfaceVariant}
      borderColor={overlay ? OVERLAY_INK.border : theme.prophecy.border}
      style={style}
    />
  );
}
