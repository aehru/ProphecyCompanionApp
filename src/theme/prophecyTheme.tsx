import {
    MD3DarkTheme,
    MD3LightTheme,
    type MD3Theme,
} from 'react-native-paper';

// MD3 surface-tone tokens that react-native-paper's MD3Colors type does not include.
// Kept in a custom `prophecy` namespace so the theme stays type-safe.
export type ProphecySurfaces = {
  surfaceDim: string;
  surfaceBright: string;
  surfaceContainerLowest: string;
  surfaceContainerLow: string;
  surfaceContainer: string;
  surfaceContainerHigh: string;
  surfaceContainerHighest: string;
  surfaceTint: string;
};

export type ProphecyTheme = MD3Theme & { prophecy: ProphecySurfaces };

/**
 * Prophecy — "Kor" theme for React Native Paper (Material Design 3).
 * Primary  : twilight amethyst — the dreamlike / Étoile-touched mood of the setting
 * Secondary: draconic bronze    — the nine Great Dragons and their hoards
 * Tertiary : dream teal         — magic shimmer / the Humaniste blue
 * Neutrals are violet-tinted (cool dusk) to sit with the amethyst.
 * Generated from HCT tonal palettes; every on-* role meets MD3 contrast.
 */

export const ProphecyLightTheme: ProphecyTheme = {
  ...MD3LightTheme,
  colors: {
    primary: '#6352A2',
    onPrimary: '#FFFFFF',
    primaryContainer: '#E7DEFF',
    onPrimaryContainer: '#1E045B',
    secondary: '#7E5617',
    onSecondary: '#FFFFFF',
    secondaryContainer: '#FFDDB4',
    onSecondaryContainer: '#291800',
    tertiary: '#006A69',
    onTertiary: '#FFFFFF',
    tertiaryContainer: '#88F4F2',
    onTertiaryContainer: '#002020',
    error: '#BA1A1A',
    onError: '#FFFFFF',
    errorContainer: '#FFDAD6',
    onErrorContainer: '#410002',
    background: '#FFFBFF',
    onBackground: '#1C1B1F',
    surface: '#FFFBFF',
    onSurface: '#1C1B1F',
    surfaceVariant: '#E6E0EF',
    onSurfaceVariant: '#484551',
    outline: '#797582',
    outlineVariant: '#CAC4D2',
    inverseSurface: '#313034',
    inverseOnSurface: '#F4EFF5',
    inversePrimary: '#CCBEFF',
    scrim: '#000000',
    shadow: '#000000',
    surfaceDisabled: 'rgba(28, 27, 31, 0.12)',
    onSurfaceDisabled: 'rgba(28, 27, 31, 0.38)',
    backdrop: 'rgba(50, 47, 58, 0.4)',
    elevation: {
      level0: '#FFFBFF',
      level1: '#F7F3FA',
      level2: '#F3EDF8',
      level3: '#EEE8F5',
      level4: '#ECE7F4',
      level5: '#E9E3F2',
    },
  },
  prophecy: {
    surfaceDim: '#DDD8DF',
    surfaceBright: '#FDF8FE',
    surfaceContainerLowest: '#FFFFFF',
    surfaceContainerLow: '#F7F2F8',
    surfaceContainer: '#F1ECF3',
    surfaceContainerHigh: '#ECE6ED',
    surfaceContainerHighest: '#E6E1E7',
    surfaceTint: '#6352A2',
  },
};

export const ProphecyDarkTheme: ProphecyTheme = {
  ...MD3DarkTheme,
  colors: {
    primary: '#CCBEFF',
    onPrimary: '#342170',
    primaryContainer: '#4B3988',
    onPrimaryContainer: '#E7DEFF',
    secondary: '#F3BD74',
    onSecondary: '#452B00',
    secondaryContainer: '#633F00',
    onSecondaryContainer: '#FFDDB4',
    tertiary: '#6AD7D6',
    onTertiary: '#003737',
    tertiaryContainer: '#00504F',
    onTertiaryContainer: '#88F4F2',
    error: '#FFB4AB',
    onError: '#690005',
    errorContainer: '#93000A',
    onErrorContainer: '#FFDAD6',
    background: '#1C1B1F',
    onBackground: '#E6E1E7',
    surface: '#141317',
    onSurface: '#E6E1E7',
    surfaceVariant: '#484551',
    onSurfaceVariant: '#CAC4D2',
    outline: '#938F9C',
    outlineVariant: '#484551',
    inverseSurface: '#E6E1E7',
    inverseOnSurface: '#313034',
    inversePrimary: '#6352A2',
    scrim: '#000000',
    shadow: '#000000',
    surfaceDisabled: 'rgba(230, 225, 231, 0.12)',
    onSurfaceDisabled: 'rgba(230, 225, 231, 0.38)',
    backdrop: 'rgba(50, 47, 58, 0.4)',
    elevation: {
      level0: '#141317',
      level1: '#1D1C23',
      level2: '#23212A',
      level3: '#282631',
      level4: '#2A2833',
      level5: '#2E2B37',
    },
  },
  prophecy: {
    surfaceDim: '#141317',
    surfaceBright: '#3A383D',
    surfaceContainerLowest: '#0F0E12',
    surfaceContainerLow: '#1C1B1F',
    surfaceContainer: '#201F23',
    surfaceContainerHigh: '#2B292E',
    surfaceContainerHighest: '#363439',
    surfaceTint: '#CCBEFF',
  },
};