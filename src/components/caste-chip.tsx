// The caste pill. Shared by the character list and the fiche header so the two
// can't drift — ringed in the DS gold (`colors.secondary`) instead of the
// neutral hairline its neighbours use, because the caste is a closed set of
// eight and reads as a badge, where the concept is free text.
//
// Renders NOTHING for a NULL caste: « Sans Caste » is a real choice, and a chip
// saying so would shout the absence of a label on every unfilled sheet.
//
// Geometry lives in `<IdentityChip>`, with the concept's and the Statut's.

import React from 'react';
import { type ViewStyle } from 'react-native';

import IdentityChip, { type ChipTone } from '@/components/ui/identity-chip';
import { CASTE_LABEL } from '@/constants/prophecy';
import { useProphecyTheme } from '@/hooks/use-prophecy-theme';
import { OVERLAY_INK } from '@/theme/overlayInk';

export default function CasteChip({
  caste,
  style,
  tone = 'surface',
}: {
  caste?: string | null;
  style?: ViewStyle;
  tone?: ChipTone;
}) {
  const theme = useProphecyTheme();
  if (!caste) return null;
  return (
    <IdentityChip
      testID="caste-chip"
      // An unknown key cannot arrive through the picker or an import —
      // `casteFromInput` folds anything it cannot place to NULL first. Only a
      // raw edit of the database reaches this, and showing it beats dropping the
      // row's only caste information.
      label={CASTE_LABEL[caste] ?? caste}
      color={tone === 'overlay' ? OVERLAY_INK.gold : theme.colors.secondary}
      style={style}
    />
  );
}
