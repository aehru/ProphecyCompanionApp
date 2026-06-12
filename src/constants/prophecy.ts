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
 * Default skill catalogue. Single global list, same for every
 * character. Each skill links to one attribut key.
 */
export const DEFAULT_SKILLS: { name: string; attribut: string }[] = [
  // --- Physique ---
  // Combat
  { name: 'Armes articulées', attribut: 'physique' },
  { name: 'Armes contondantes', attribut: 'physique' },
  { name: 'Armes de choc', attribut: 'physique' },
  { name: 'Armes de jet', attribut: 'physique' },
  { name: 'Armes doubles', attribut: 'physique' },
  { name: 'Armes d\'hast', attribut: 'physique' },
  { name: 'Armes tranchantes', attribut: 'physique' },
  { name: 'Bouclier', attribut: 'physique' },
  { name: 'Corps à corps', attribut: 'physique' },
  // Mouvement
  { name: 'Acrobaties', attribut: 'physique' },
  { name: 'Athlétisme', attribut: 'physique' },
  { name: 'Equitation', attribut: 'physique' },
  { name: 'Escalade', attribut: 'physique' },
  { name: 'Esquive', attribut: 'physique' },
  { name: 'Natation', attribut: 'physique' },
  // --- Mental ---
  // Théorie
  { name: 'Castes', attribut: 'mental' },
  { name: 'Connaissance de la magie', attribut: 'mental' },
  { name: 'Connaissance des animaux', attribut: 'mental' },
  { name: 'Connaissance des dragons', attribut: 'mental' },
  { name: 'Géographie', attribut: 'mental' },
  { name: 'Histoire', attribut: 'mental' },
  { name: 'Lois', attribut: 'mental' },
  { name: 'Orientation', attribut: 'mental' },
  { name: 'Stratégie', attribut: 'mental' },
  { name: 'Conception', attribut: 'mental' },
  // Pratique
  { name: 'Alchimie', attribut: 'mental' },
  { name: 'Astrologie', attribut: 'mental' },
  { name: 'Cartographie', attribut: 'mental' },
  { name: 'Estimation', attribut: 'mental' },
  { name: 'Herboristerie', attribut: 'mental' },
  { name: 'Lire et écrire', attribut: 'mental' },
  { name: 'Matières premières', attribut: 'mental' },
  { name: 'Médecine', attribut: 'mental' },
  { name: 'Premiers soins', attribut: 'mental' },
  { name: 'Survie', attribut: 'mental' },
  { name: 'Vie en cité', attribut: 'mental' },
  // --- Manuel ---
  // Technique
  { name: 'Armes de siège', attribut: 'manuel' },
  { name: 'Artisanat', attribut: 'manuel' },
  { name: 'Artisanat élémentaire', attribut: 'manuel' },
  { name: 'Contrefaçon', attribut: 'manuel' },
  { name: 'Discrétion', attribut: 'manuel' },
  { name: 'Pièges', attribut: 'manuel' },
  { name: 'Pister', attribut: 'manuel' },
  { name: 'Sabotage', attribut: 'manuel' },
  // Manipulation
  { name: 'Armes à projectiles', attribut: 'manuel' },
  { name: 'Attelages', attribut: 'manuel' },
  { name: 'Déguisement', attribut: 'manuel' },
  { name: 'Déverrouillage', attribut: 'manuel' },
  { name: 'Don artistique', attribut: 'manuel' },
  { name: 'Faire les poches', attribut: 'manuel' },
  { name: 'Jeu', attribut: 'manuel' },
  { name: 'Jongler', attribut: 'manuel' },
  // --- Social ---
  // Communication
  { name: 'Baratin', attribut: 'social' },
  { name: 'Conte', attribut: 'social' },
  { name: 'Eloquence', attribut: 'social' },
  { name: 'Marchandage', attribut: 'social' },
  { name: 'Psychologie', attribut: 'social' },
  // Influence
  { name: 'Art de la scène', attribut: 'social' },
  { name: 'Commandement', attribut: 'social' },
  { name: 'Diplomatie', attribut: 'social' },
  { name: 'Dressage', attribut: 'social' },
  { name: 'Intimidation', attribut: 'social' },
  { name: 'Séduction', attribut: 'social' },
];

export const WOUND_LEVELS = [
  { key: 'egratignure', label: 'Égratignure', damage: '1-10', malus: null },
  { key: 'legere', label: 'Légère', damage: '11-20', malus: '-1' },
  { key: 'grave', label: 'Grave', damage: '21-30', malus: '-3' },
  { key: 'fatale', label: 'Fatale', damage: '31-40', malus: '-5' },
  { key: 'mort', label: 'Mort', damage: '41+', malus: null },
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
