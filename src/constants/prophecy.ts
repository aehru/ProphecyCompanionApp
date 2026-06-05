// Prophecy 2e domain labels. Keys are French-without-accents (match DB columns);
// labels render with accents. `abbr` shown in tight UI to save space.

export const TENDANCES = [
  { key: 'dragon', label: 'Dragon', color: '#C62828', textColor: '#FFFFFF', border: '#8E1B1B' },
  { key: 'fatalite', label: 'Fatalité', color: '#1B5E20', textColor: '#FFFFFF', border: '#0E3B12' },
  { key: 'homme', label: 'Homme', color: '#FFFFFF', textColor: '#000000', border: '#9E9E9E' },
] as const;

/** Number of "puces" slots shown for a tendance subnumber (0–10). */
export const MAX_PUCES = 10;

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

/** Attribut key → display label (skills link to one attribut). */
export const ATTRIBUT_LABEL: Record<string, string> = Object.fromEntries(
  ATTRIBUTS.map((a) => [a.key, a.label]),
);

/**
 * PLACEHOLDER default skill catalogue. Single global list, same for every
 * character. Each skill links to one attribut key. Replace names/attributs
 * with the real Prophecy 2e compétences list when available.
 */
export const DEFAULT_SKILLS: { name: string; attribut: string }[] = [
  // Physique
  { name: 'Athlétisme', attribut: 'physique' },
  { name: 'Combat', attribut: 'physique' },
  { name: 'Esquive', attribut: 'physique' },
  { name: 'Endurance', attribut: 'physique' },
  // Mental
  { name: 'Connaissance', attribut: 'mental' },
  { name: 'Vigilance', attribut: 'mental' },
  { name: 'Magie', attribut: 'mental' },
  { name: 'Survie', attribut: 'mental' },
  // Manuel
  { name: 'Artisanat', attribut: 'manuel' },
  { name: 'Discrétion', attribut: 'manuel' },
  { name: 'Tir', attribut: 'manuel' },
  { name: 'Pilotage', attribut: 'manuel' },
  // Social
  { name: 'Persuasion', attribut: 'social' },
  { name: 'Commandement', attribut: 'social' },
  { name: 'Tromperie', attribut: 'social' },
  { name: 'Intimidation', attribut: 'social' },
];

export const WOUND_LEVELS = [
  { key: 'egratinure', label: 'Égratinure' },
  { key: 'legere', label: 'Légère' },
  { key: 'grave', label: 'Grave' },
  { key: 'fatale', label: 'Fatale' },
  { key: 'mort', label: 'Mort' },
] as const;

/** Spendable resource pools: max on the character, current tracked in the status. */
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
  'initiativeMax',
];
