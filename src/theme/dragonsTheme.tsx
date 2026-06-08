import type { MD3Theme } from 'react-native-paper';

/**
 * Prophecy — accent themes for the nine Great Dragons (eight caste-patrons + Kalimsshar).
 * Each carries the four primary roles for light and dark, generated from a
 * single HCT hue per dragon's elemental sphere. Use to recolour the app's
 * primary based on a character's draconic allegiance.
 */
export type DragonKey =
  | 'kroryn'
  | 'heyra'
  | 'nenya'
  | 'kezyr'
  | 'brorne'
  | 'khy'
  | 'szyl'
  | 'ozyr'
  | 'kalimsshar';

export type DragonAccent = {
  name: string;
  domain: string;
  caste: string;
  light: { primary: string; onPrimary: string; primaryContainer: string; onPrimaryContainer: string };
  dark:  { primary: string; onPrimary: string; primaryContainer: string; onPrimaryContainer: string };
};

export const DragonAccents: Record<DragonKey, DragonAccent> = {
  kroryn: {
    name: 'Kroryn',
    domain: "Feu",
    caste: 'Warriors',
    light: {
      primary: '#A73907',
      onPrimary: '#FFFFFF',
      primaryContainer: '#FFDBCF',
      onPrimaryContainer: '#380D00',
    },
    dark: {
      primary: '#FFB59B',
      onPrimary: '#5C1A00',
      primaryContainer: '#812800',
      onPrimaryContainer: '#FFDBCF',
    },
  },
  heyra: {
    name: 'Heyra',
    domain: "Nature",
    caste: 'Prodigies',
    light: {
      primary: '#336A28',
      onPrimary: '#FFFFFF',
      primaryContainer: '#B4F3A0',
      onPrimaryContainer: '#012200',
    },
    dark: {
      primary: '#99D686',
      onPrimary: '#013A00',
      primaryContainer: '#1A5212',
      onPrimaryContainer: '#B4F3A0',
    },
  },
  nenya: {
    name: 'Nenya',
    domain: "Magie / Rêves",
    caste: 'Mages',
    light: {
      primary: '#6352A2',
      onPrimary: '#FFFFFF',
      primaryContainer: '#E7DEFF',
      onPrimaryContainer: '#1E045B',
    },
    dark: {
      primary: '#CCBEFF',
      onPrimary: '#342170',
      primaryContainer: '#4B3988',
      onPrimaryContainer: '#E7DEFF',
    },
  },
  kezyr: {
    name: 'Kezyr',
    domain: "Métal",
    caste: 'Artisans',
    light: {
      primary: '#535F70',
      onPrimary: '#FFFFFF',
      primaryContainer: '#D7E3F8',
      onPrimaryContainer: '#101C2B',
    },
    dark: {
      primary: '#BBC7DB',
      onPrimary: '#253141',
      primaryContainer: '#3C4858',
      onPrimaryContainer: '#D7E3F8',
    },
  },
  brorne: {
    name: 'Brorne',
    domain: "Pierre",
    caste: 'Protectors',
    light: {
      primary: '#6F5B45',
      onPrimary: '#FFFFFF',
      primaryContainer: '#FADEC2',
      onPrimaryContainer: '#271908',
    },
    dark: {
      primary: '#DCC2A7',
      onPrimary: '#3D2D1A',
      primaryContainer: '#56432F',
      onPrimaryContainer: '#FADEC2',
    },
  },
  khy: {
    name: 'Khy',
    domain: "Cités",
    caste: 'Merchants',
    light: {
      primary: '#7D5700',
      onPrimary: '#FFFFFF',
      primaryContainer: '#FFDEAB',
      onPrimaryContainer: '#271900',
    },
    dark: {
      primary: '#FFBA30',
      onPrimary: '#422C00',
      primaryContainer: '#5F4100',
      onPrimaryContainer: '#FFDEAB',
    },
  },
  szyl: {
    name: 'Szyl',
    domain: "Vents",
    caste: 'Travelers',
    light: {
      primary: '#00696F',
      onPrimary: '#FFFFFF',
      primaryContainer: '#90F2FB',
      onPrimaryContainer: '#002022',
    },
    dark: {
      primary: '#73D5DE',
      onPrimary: '#00363A',
      primaryContainer: '#004F54',
      onPrimaryContainer: '#90F2FB',
    },
  },
  ozyr: {
    name: 'Ozyr',
    domain: "Océans",
    caste: 'Scholars',
    light: {
      primary: '#00629D',
      onPrimary: '#FFFFFF',
      primaryContainer: '#CFE5FF',
      onPrimaryContainer: '#001D34',
    },
    dark: {
      primary: '#99CBFF',
      onPrimary: '#003355',
      primaryContainer: '#004A78',
      onPrimaryContainer: '#CFE5FF',
    },
  },
  kalimsshar: {
    name: 'Kalimsshar',
    domain: "Ombre / Temps",
    caste: '— (casteless)',
    light: {
      primary: '#5D5B7A',
      onPrimary: '#FFFFFF',
      primaryContainer: '#E3DFFF',
      onPrimaryContainer: '#1A1834',
    },
    dark: {
      primary: '#C6C3E7',
      onPrimary: '#2F2D4A',
      primaryContainer: '#454461',
      onPrimaryContainer: '#E3DFFF',
    },
  },
};

/** Merge a dragon's accent onto a base Paper theme (swaps the primary group). */
export function withDragon(
  base: MD3Theme,
  dragon: DragonKey,
  scheme: 'light' | 'dark',
): MD3Theme {
  const a = DragonAccents[dragon][scheme];
  return { ...base, colors: { ...base.colors, ...a } };
}