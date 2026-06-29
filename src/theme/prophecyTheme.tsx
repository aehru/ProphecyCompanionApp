import {
    DarkTheme as NavigationDarkBaseTheme,
    DefaultTheme as NavigationDefaultTheme,
    type Theme as NavigationTheme,
} from '@react-navigation/native';
import {
    configureFonts,
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
  // DS hairlines: gold-tinted (primary at low alpha). `border` for cards,
  // `borderSoft` for inner tiles / dividers.
  border: string;
  borderSoft: string;
};

export type ProphecyTheme = MD3Theme & { prophecy: ProphecySurfaces };

/* ===========================================================================
   "Prophecy Mobile Design System" — parchment & gold.
   Source of truth: the `Prophecy Design System.dc.html` design project.
   Display : Cinzel (serif, engraved titles)
   Body/UI : Noto Sans
   (Cormorant Garamond is used only for italic lore/flavour text — not wired
    into the MD3 scale; apply directly where biography/flavour copy renders.)

   The DS ships 11 flat tokens per scheme:
     bg · surface · surface-2 · primary · secondary · dragon · magic · nature
     · text · muted · on-primary
   MD3 needs ~30 roles, so containers / error / outline-variant / elevation /
   surface-containers below are DERIVED by tinting within the parchment/gold
   palette. Each derived value is tagged "derived"; the 11 DS tokens are tagged
   "DS". Domain dragon/magic/nature accents map to MD3 tertiary and are exposed
   in `prophecy` for callers; the fixed Prophecy 2e tendance trio lives in
   constants/prophecy.ts and is intentionally untouched.
   =========================================================================== */

/**
 * Cinzel (serif display) on Display/Headline/Title; Noto Sans on Body/Label.
 * Sizes / line-heights / tracking stay at react-native-paper's MD3 defaults;
 * only the family changes per variant.
 */
const isDisplayVariant = (variant: string) =>
  variant.startsWith('display') ||
  variant.startsWith('headline') ||
  variant.startsWith('title');

const familyFor = (variant: string, weight: string | undefined) => {
  if (isDisplayVariant(variant)) {
    // title-medium / title-small are weight 500 in MD3 — keep them a touch lighter.
    return weight === '500' ? 'Cinzel_500Medium' : 'Cinzel_600SemiBold';
  }
  return weight === '500' ? 'NotoSans_500Medium' : 'NotoSans_400Regular';
};

const prophecyFonts = configureFonts({
  config: Object.fromEntries(
    Object.entries(MD3LightTheme.fonts).map(([variant, scale]) => [
      variant,
      {
        ...scale,
        fontFamily: familyFor(variant, (scale as { fontWeight?: string }).fontWeight),
      },
    ]),
  ) as typeof MD3LightTheme.fonts,
});

export const ProphecyLightTheme: ProphecyTheme = {
  ...MD3LightTheme,
  fonts: prophecyFonts,
  // Rounds Paper components that read roundness (TextInput outline, Menu,
  // Snackbar, Dialog) so vanilla <TextInput> fields match the DS without a wrapper.
  roundness: 8,
  colors: {
    primary: '#7A4D24',            /* DS */
    onPrimary: '#F8F2E8',          /* DS (on-primary) */
    primaryContainer: '#E9DCC0',   /* derived — pale gold */
    onPrimaryContainer: '#2A1A09', /* derived — primary, deepened */
    secondary: '#A37B3F',          /* DS */
    onSecondary: '#F8F2E8',        /* derived — light parchment */
    secondaryContainer: '#F2EAD9', /* DS (surface-2) */
    onSecondaryContainer: '#2F241A', /* DS (text) */
    tertiary: '#4F6475',           /* DS (magic — slate) */
    onTertiary: '#F8F2E8',         /* derived */
    tertiaryContainer: '#D6E0E7',  /* derived — pale slate */
    onTertiaryContainer: '#14242E', /* derived */
    error: '#8C3E30',              /* derived — muted brick (palette-aligned) */
    onError: '#F8F2E8',            /* derived */
    errorContainer: '#F2D9D1',     /* derived — pale brick */
    onErrorContainer: '#3A130C',   /* derived */
    background: '#EEE7D7',          /* DS (bg) */
    onBackground: '#2F241A',        /* DS (text) */
    surface: '#F8F2E8',            /* DS */
    onSurface: '#2F241A',          /* DS (text) */
    surfaceVariant: '#F2EAD9',     /* DS (surface-2) */
    onSurfaceVariant: '#6B5B47',   /* DS (muted) */
    outline: 'rgba(122,77,36,0.30)', /* DS (--border) — gold hairline on fields/dividers */
    outlineVariant: '#CDBC9D',     /* derived — light parchment hairline */
    inverseSurface: '#2F241A',     /* derived (text) */
    inverseOnSurface: '#F8F2E8',   /* derived (surface) */
    inversePrimary: '#C69C4D',     /* DS dark primary */
    scrim: '#000000',
    shadow: '#000000',
    surfaceDisabled: 'rgba(47, 36, 26, 0.12)',   /* derived from text */
    onSurfaceDisabled: 'rgba(47, 36, 26, 0.38)', /* derived from text */
    backdrop: 'rgba(31, 24, 16, 0.4)',           /* derived */
    elevation: {
      /* derived — warm parchment ladder bg → surface */
      level0: '#EEE7D7',
      level1: '#F2EAD9',
      level2: '#F4EDDE',
      level3: '#F6F0E3',
      level4: '#F7F1E6',
      level5: '#F8F2E8',
    },
  },
  prophecy: {
    surfaceDim: '#E3DAC6',           /* derived */
    surfaceBright: '#FBF6EC',        /* derived */
    surfaceContainerLowest: '#FFFDF8', /* derived */
    surfaceContainerLow: '#F8F2E8',  /* DS (surface) */
    surfaceContainer: '#F2EAD9',     /* DS (surface-2) */
    surfaceContainerHigh: '#ECE2CE', /* derived */
    surfaceContainerHighest: '#E6DBC4', /* derived */
    surfaceTint: '#7A4D24',          /* DS (primary) */
    border: 'rgba(122,77,36,0.30)',     /* DS (--border) */
    borderSoft: 'rgba(122,77,36,0.14)', /* DS (--border-soft) */
  },
};

export const ProphecyDarkTheme: ProphecyTheme = {
  ...MD3DarkTheme,
  fonts: prophecyFonts,
  roundness: 8,
  colors: {
    primary: '#C69C4D',            /* DS */
    onPrimary: '#141618',          /* DS (on-primary) */
    primaryContainer: '#4A3A1C',   /* derived — deep gold-brown */
    onPrimaryContainer: '#E1C37A', /* derived (secondary) */
    secondary: '#E1C37A',          /* DS */
    onSecondary: '#141618',        /* DS (on-primary) */
    secondaryContainer: '#3A301A', /* derived */
    onSecondaryContainer: '#E8E4D6', /* DS (text) */
    tertiary: '#6D8CA4',           /* DS (magic — slate) */
    onTertiary: '#102330',         /* derived */
    tertiaryContainer: '#2A3C49',  /* derived */
    onTertiaryContainer: '#C9DCE8', /* derived */
    error: '#D98A78',              /* derived — light brick */
    onError: '#2A0E08',            /* derived */
    errorContainer: '#5A2118',     /* derived */
    onErrorContainer: '#F2D9D1',   /* derived */
    background: '#141618',          /* DS (bg) */
    onBackground: '#E8E4D6',        /* DS (text) */
    surface: '#1E1F22',            /* DS */
    onSurface: '#E8E4D6',          /* DS (text) */
    surfaceVariant: '#26282B',     /* DS (surface-2) */
    onSurfaceVariant: '#9A958A',   /* DS (muted) */
    outline: 'rgba(198,156,77,0.32)', /* DS (--border) — gold hairline on fields/dividers */
    outlineVariant: '#3A3C40',     /* derived */
    inverseSurface: '#E8E4D6',     /* derived (text) */
    inverseOnSurface: '#1E1F22',   /* derived (surface) */
    inversePrimary: '#7A4D24',     /* DS light primary */
    scrim: '#000000',
    shadow: '#000000',
    surfaceDisabled: 'rgba(232, 228, 214, 0.12)',   /* derived from text */
    onSurfaceDisabled: 'rgba(232, 228, 214, 0.38)', /* derived from text */
    backdrop: 'rgba(10, 11, 12, 0.5)',              /* derived */
    elevation: {
      /* derived — dark ladder bg → surface-2 */
      level0: '#141618',
      level1: '#1E1F22',
      level2: '#232427',
      level3: '#26282B',
      level4: '#292B2E',
      level5: '#2D2F33',
    },
  },
  prophecy: {
    surfaceDim: '#141618',           /* DS (bg) */
    surfaceBright: '#34363A',        /* derived */
    surfaceContainerLowest: '#0F1012', /* derived */
    surfaceContainerLow: '#1E1F22',  /* DS (surface) */
    surfaceContainer: '#26282B',     /* DS (surface-2) */
    surfaceContainerHigh: '#303236', /* derived */
    surfaceContainerHighest: '#3A3C40', /* derived */
    surfaceTint: '#C69C4D',          /* DS (primary) */
    border: 'rgba(198,156,77,0.32)',     /* DS (--border) */
    borderSoft: 'rgba(198,156,77,0.14)', /* DS (--border-soft) */
  },
};

/**
 * React Navigation themes derived from the same palette, so the navigation
 * chrome (screen backgrounds, headers, tab bar, borders) matches Paper. Header
 * titles use Cinzel (the engraved display face); body/labels use Noto Sans.
 */
const navFonts: NavigationTheme['fonts'] = {
  regular: { fontFamily: 'NotoSans_400Regular', fontWeight: '400' },
  medium: { fontFamily: 'NotoSans_500Medium', fontWeight: '500' },
  bold: { fontFamily: 'Cinzel_600SemiBold', fontWeight: '600' },
  heavy: { fontFamily: 'Cinzel_600SemiBold', fontWeight: '700' },
};

export const ProphecyNavigationLightTheme: NavigationTheme = {
  ...NavigationDefaultTheme,
  dark: false,
  colors: {
    primary: ProphecyLightTheme.colors.primary,
    background: ProphecyLightTheme.colors.background,
    card: ProphecyLightTheme.colors.surface,
    text: ProphecyLightTheme.colors.onSurface,
    border: ProphecyLightTheme.colors.outlineVariant,
    notification: ProphecyLightTheme.colors.error,
  },
  fonts: navFonts,
};

export const ProphecyNavigationDarkTheme: NavigationTheme = {
  ...NavigationDarkBaseTheme,
  dark: true,
  colors: {
    primary: ProphecyDarkTheme.colors.primary,
    background: ProphecyDarkTheme.colors.background,
    card: ProphecyDarkTheme.colors.surface,
    text: ProphecyDarkTheme.colors.onSurface,
    border: ProphecyDarkTheme.colors.outlineVariant,
    notification: ProphecyDarkTheme.colors.error,
  },
  fonts: navFonts,
};
