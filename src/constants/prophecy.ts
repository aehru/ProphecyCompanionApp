// Prophecy 2e domain labels. Keys are French-without-accents (match DB columns);
// labels render with accents. `abbr` shown in tight UI to save space.

export const TENDANCES = [
  { key: 'dragon', label: 'Dragon' },
  { key: 'fatalite', label: 'Fatalité' },
  { key: 'homme', label: 'Homme' },
] as const;

export const CARACTERISTIQUES = [
  { key: 'force', abbr: 'FOR', label: 'Force' },
  { key: 'resistance', abbr: 'RES', label: 'Résistance' },
  { key: 'intelligence', abbr: 'INT', label: 'Intelligence' },
  { key: 'volonte', abbr: 'VOL', label: 'Volonté' },
  { key: 'coordination', abbr: 'COO', label: 'Coordination' },
  { key: 'perception', abbr: 'PER', label: 'Perception' },
  { key: 'presence', abbr: 'PRE', label: 'Présence' },
  { key: 'empathie', abbr: 'EMP', label: 'Empathie' },
] as const;

export const ATTRIBUTS = [
  { key: 'physique', label: 'Physique' },
  { key: 'mental', label: 'Mental' },
  { key: 'manuel', label: 'Manuel' },
  { key: 'social', label: 'Social' },
] as const;

export const WOUND_LEVELS = [
  { key: 'egratinure', label: 'Égratinure' },
  { key: 'legere', label: 'Légère' },
  { key: 'grave', label: 'Grave' },
  { key: 'fatale', label: 'Fatale' },
  { key: 'mort', label: 'Mort' },
] as const;

/** Spendable resource pools: max on the character, current tracked in combat. */
export const RESOURCES = [
  { key: 'maitrise', label: 'Maîtrise' },
  { key: 'chance', label: 'Chance' },
] as const;

/** Every numeric character column edited by the form. */
export const NUMERIC_KEYS: string[] = [
  ...TENDANCES.flatMap((t) => [t.key, `${t.key}Sub`]),
  ...CARACTERISTIQUES.map((c) => c.key),
  ...ATTRIBUTS.map((a) => a.key),
  ...WOUND_LEVELS.map((w) => `${w.key}Max`),
  ...RESOURCES.map((r) => `${r.key}Max`),
];
