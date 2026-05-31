import { useTheme } from 'react-native-paper';

import type { ProphecyTheme } from '@/app/prophecyTheme';

/**
 * react-native-paper's `useTheme` pre-typed with {@link ProphecyTheme}.
 * Exposes both the MD3 `colors` and the custom `prophecy` surface tokens
 * without restating the generic in every component.
 */
export function useProphecyTheme() {
  return useTheme<ProphecyTheme>();
}
