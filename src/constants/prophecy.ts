// Prophecy 2e domain labels. Keys are French-without-accents (match DB columns);
// labels render with accents. `abbr` shown in tight UI to save space.

export const TENDANCES = [
  { key: 'dragon', label: 'Dragon', color: '#C62828', textColor: '#FFFFFF', border: '#8E1B1B' },
  { key: 'fatalite', label: 'Fatalité', color: '#1B5E20', textColor: '#FFFFFF', border: '#0E3B12' },
  { key: 'homme', label: 'Homme', color: '#FFFFFF', textColor: '#000000', border: '#9E9E9E' },
] as const;

/** Number of "puces" slots shown for a tendance subnumber (0–10). */
export const MAX_PUCES = 10;

/**
 * Castes — the social order a character was born into. Purely an identity label
 * here: nothing in the app derives a stat, a bonus or a catalogue filter from
 * it, so it sits next to `concept` rather than in the rules layer.
 *
 * Stored as the accent-free `key` on `characters.caste`, rendered with accents.
 * NULL is a MEANINGFUL value, not a missing one: « Sans Caste » is a real
 * choice a player makes, which is why there is no `sansCaste` entry in the list
 * (an enum member would let a row be both NULL and "none").
 */
export const CASTES = [
  { key: 'artisan', label: 'Artisan' },
  { key: 'combattant', label: 'Combattant' },
  { key: 'commercant', label: 'Commerçant' },
  { key: 'erudit', label: 'Érudit' },
  { key: 'mage', label: 'Mage' },
  { key: 'prodige', label: 'Prodige' },
  { key: 'protecteur', label: 'Protecteur' },
  { key: 'voyageur', label: 'Voyageur' },
] as const;

export type CasteKey = (typeof CASTES)[number]['key'];

/** What a NULL caste is called on screen. */
export const SANS_CASTE_LABEL = 'Sans Caste';

/** Caste key → display label (accents restored). */
export const CASTE_LABEL: Record<string, string> = Object.fromEntries(
  CASTES.map((c) => [c.key, c.label]),
);

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
 * Magic spheres. `key` is the column base: max lives on the character
 * (`${key}Max`), current value on actual_state (`${key}Current`). A sphere is
 * "known" once its max is > 0. Fixed catalogue — no custom spheres.
 */
export const SPHERES = [
  { key: 'sphereCites', label: 'Cités' },
  { key: 'sphereFeu', label: 'Feu' },
  { key: 'sphereMetal', label: 'Métal' },
  { key: 'sphereNature', label: 'Nature' },
  { key: 'sphereOceans', label: 'Océans' },
  { key: 'spherePierre', label: 'Pierre' },
  { key: 'sphereReves', label: 'Rêves' },
  { key: 'sphereVents', label: 'Vents' },
  { key: 'sphereOmbre', label: "Ombre" },
] as const;

/**
 * Magic disciplines. Plain single-value stats like the caractéristiques — one
 * int column per discipline on the character (no max/current pool). `abbr` is
 * for chips and other tight spots (the spell catalogue's filters), never for a
 * form field — those keep the full `label`.
 */
export const DISCIPLINES = [
  { key: 'magieInvocatoire', label: 'Invocatoire', abbr: 'Invo.' },
  { key: 'magieInstinctive', label: 'Instinctive', abbr: 'Inst.' },
  { key: 'sorcellerie', label: 'Sorcellerie', abbr: 'Sorc.' },
] as const;

/**
 * Bonus granted by a "clé parfaite" — a perfect casting key a mage can craft for
 * one of their spells. It makes the spell easier to cast: the roll gets +5,
 * shown in the UI as a difficulty lowered by the same amount.
 */
export const CLE_PARFAITE_BONUS = 5;

/** Discipline / sphere key → display label (for spell fields). */
export const DISCIPLINE_LABEL: Record<string, string> = Object.fromEntries(
  DISCIPLINES.map((d) => [d.key, d.label]),
);
export const SPHERE_LABEL: Record<string, string> = Object.fromEntries(
  SPHERES.map((s) => [s.key, s.label]),
);

/**
 * Axes a spell tag can belong to. Purely a grouping for the filter UI — a spell
 * carries a flat list of tag keys and may have several from the same axis (a
 * spell that both protects and hinders is `protection` + `entrave`).
 */
export const SPELL_TAG_GROUPS = [
  { key: 'role', label: 'Rôle' },
  { key: 'target', label: 'Cible' },
  { key: 'context', label: 'Contexte' },
] as const;

/**
 * Spell taxonomy — OUR classification, not a rulebook one: with 300+ sortilèges
 * the sphère/discipline/niveau triple is no longer enough to find anything, so
 * every catalogue spell is tagged by what it DOES. Being ours and not a game
 * term, the keys are ENGLISH like any other generic column; `label` carries the
 * French the UI shows. The CSV is authored with the French labels and the
 * generator normalizes them, exactly as it does for sphères and disciplines.
 *
 * Deliberately coarse: a tag exists to narrow 300 spells to 20, not to encode
 * the rules. When in doubt a spell gets fewer tags, never a new one — the list
 * only grows if a whole family of spells has nowhere to sit.
 */
export const SPELL_TAGS = [
  // role — what the spell is for
  { key: 'attack', label: 'Attaque', group: 'role' },
  { key: 'protection', label: 'Protection', group: 'role' },
  { key: 'buff', label: 'Amélioration', group: 'role' },
  { key: 'debuff', label: 'Entrave', group: 'role' },
  { key: 'detection', label: 'Détection', group: 'role' },
  { key: 'movement', label: 'Déplacement', group: 'role' },
  { key: 'healing', label: 'Soin', group: 'role' },
  { key: 'summoning', label: 'Invocation', group: 'role' },
  { key: 'illusion', label: 'Illusion', group: 'role' },
  { key: 'communication', label: 'Communication', group: 'role' },
  { key: 'creation', label: 'Création', group: 'role' },
  { key: 'utility', label: 'Utilitaire', group: 'role' },
  // target — who or what it lands on
  { key: 'self', label: 'Soi', group: 'target' },
  { key: 'ally', label: 'Allié', group: 'target' },
  { key: 'enemy', label: 'Ennemi', group: 'target' },
  { key: 'area', label: 'Zone', group: 'target' },
  { key: 'object', label: 'Objet', group: 'target' },
  { key: 'place', label: 'Lieu', group: 'target' },
  // context — when it comes out
  { key: 'combat', label: 'Combat', group: 'context' },
  { key: 'exploration', label: 'Exploration', group: 'context' },
  { key: 'social', label: 'Social', group: 'context' },
  { key: 'ritual', label: 'Rituel', group: 'context' },
  { key: 'urban', label: 'Urbain', group: 'context' },
] as const;

export type SpellTag = (typeof SPELL_TAGS)[number]['key'];

/** Spell tag key → display label (accented). */
export const SPELL_TAG_LABEL: Record<string, string> = Object.fromEntries(
  SPELL_TAGS.map((t) => [t.key, t.label]),
);

/** Spell tag key → its axis, one of {@link SPELL_TAG_GROUPS}. */
export const SPELL_TAG_GROUP: Record<string, string> = Object.fromEntries(
  SPELL_TAGS.map((t) => [t.key, t.group]),
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
  { name: 'Armes mécanique', attribut: 'manuel' },
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

/**
 * Default weapon catalogue. Empty placeholder for now — a future PR will fill
 * this with the rulebook's standard weapons (and a "add from catalogue" flow).
 * Fields mirror the `weapons` table; formula columns hold raw formula strings.
 */
export const DEFAULT_WEAPONS: {
  name: string;
  damage: string;
  prerequisites: string;
  creationDifficulty: number;
  creationTime: number;
  initMelee: number;
  initCorpsACorps: number;
  special: string;
  rangeEffective: string | null;
  rangeMax: string | null;
}[] = [];

export const WOUND_LEVELS = [
  { key: 'egratignure', label: 'Égratignure', damage: '1-10', malus: null },
  { key: 'legere', label: 'Légère', damage: '11-20', malus: '-1' },
  { key: 'grave', label: 'Grave', damage: '21-30', malus: '-3' },
  { key: 'fatale', label: 'Fatale', damage: '31-40', malus: '-5' },
  { key: 'mort', label: 'Mort', damage: '41+', malus: null },
] as const;

/**
 * THE time scale — ordered by growing real duration. ONE list for every
 * duration in the app: how long a temporary effect lasts, how long a spell
 * takes to cast, and how long a spell's own effect runs. They were briefly two
 * lists (a short one for effects, a longer one for spells) and that was a
 * mistake: a spell whose durée is « (1 + NR) semaines » has to be able to
 * become an `effects` row without a conversion step, so both sides need the
 * same vocabulary.
 *
 * Units are independent of each other — a "time passes" control ticks down only
 * effects sharing the chosen unit (no conversion between actions/tours/minutes;
 * 60 "minute" effects do NOT collapse into one "hour" tick). That is also why
 * `cycle` can sit here at all: the rulebook never gives it an exact equivalence
 * in days, and nothing here needs one.
 *
 * `round` keeps its DB key for back-compat (rows and exports predate the
 * rename) but reads « Tour », the rulebook's word.
 */
export const TIME_UNITS = [
  { key: 'action', label: 'Action', plural: 'Actions' },
  { key: 'round', label: 'Tour', plural: 'Tours' },
  { key: 'minute', label: 'Minute', plural: 'Minutes' },
  { key: 'hour', label: 'Heure', plural: 'Heures' },
  { key: 'day', label: 'Jour', plural: 'Jours' },
  { key: 'week', label: 'Semaine', plural: 'Semaines' },
  // The Prophecy calendar's OWN units, used as durations by a couple dozen
  // enchantment spells ("l'enchantement dure (1 + NR) cycles", "ce sort dure un
  // Augure"). Their position here is by convention, not measurement — the
  // rulebook gives neither an equivalence in days, and nothing needs one since
  // units never convert into one another.
  { key: 'cycle', label: 'Cycle', plural: 'Cycles' },
  { key: 'augure', label: 'Augure', plural: 'Augures' },
  { key: 'month', label: 'Mois', plural: 'Mois' },
  { key: 'year', label: 'An', plural: 'Ans' },
] as const;

export type TimeUnit = (typeof TIME_UNITS)[number]['key'];

/**
 * Sentinel duration for an effect that never ticks down and never expires
 * (always-on bonus/malus). Stored in `effects.durationUnit`; NOT a member of
 * TIME_UNITS (which stays the ticking-time set), so it never leaks into "temps
 * écoulé" controls or spell pickers.
 */
export const PERMANENT_UNIT = 'permanent';

/** Unit key → singular label, for compact display (e.g. "3 Tour"). */
export const TIME_UNIT_LABEL: Record<string, string> = {
  ...Object.fromEntries(TIME_UNITS.map((u) => [u.key, u.label])),
  [PERMANENT_UNIT]: 'Permanent',
};

/**
 * Duration unit rendered inline after an amount — « 4 jours », « 1 + NR tours ».
 * Lowercase, because it reads as part of a sentence rather than as a field
 * label. `amount` picks singular vs plural; pass null when the amount is still
 * symbolic (« 1 + NR »), which reads as a plural.
 */
export function timeUnitLabel(key: string, amount?: number | null): string {
  const unit = TIME_UNITS.find((u) => u.key === key);
  if (!unit) return '';
  return (amount != null && Math.abs(amount) < 2 ? unit.label : unit.plural).toLowerCase();
}

/**
 * Targets an effect can apply to: every roll (`all`), one caractéristique, or
 * one attribut. Used to build the target picker and to label an effect's scope.
 */
export const EFFECT_TARGETS: { key: string; label: string }[] = [
  { key: 'all', label: 'Tous les jets' },
  ...CARACTERISTIQUES.map((c) => ({ key: c.key, label: c.label })),
  ...ATTRIBUTS.map((a) => ({ key: a.key, label: a.label })),
];

/** Effect target key → display label. */
export const EFFECT_TARGET_LABEL: Record<string, string> = Object.fromEntries(
  EFFECT_TARGETS.map((t) => [t.key, t.label]),
);

/** Spendable resource pools: max on the character, current tracked in the status. */
export const RESOURCES = [
  { key: 'maitrise', label: 'Maîtrise' },
  { key: 'chance', label: 'Chance' },
] as const;

/**
 * Money — Drac coins. Stored as separate counts on actual_state (no universal
 * conversion). Keys match the actual_state columns. Ordered high → low value.
 */
export const MONEY = [
  { key: 'dracOr', label: "Drac d'or", abbr: 'do' },
  { key: 'dracArgent', label: "Drac d'argent", abbr: 'da' },
  { key: 'dracBronze', label: 'Drac de bronze', abbr: 'db' },
  { key: 'dracFer', label: 'Drac de fer', abbr: 'df' },
] as const;

/** Every numeric character column edited by the form. */
export const NUMERIC_KEYS: string[] = [
  ...TENDANCES.flatMap((t) => [t.key, `${t.key}Sub`]),
  ...CARACTERISTIQUES.map((c) => c.key),
  ...ATTRIBUTS.map((a) => a.key),
  ...WOUND_LEVELS.map((w) => `${w.key}Max`),
  ...RESOURCES.map((r) => `${r.key}Max`),
  'initiativeMax',
  // Magic maxes + disciplines are all form-edited (Magie tab). Per-sphere/reserve
  // current values live on actual_state and are tracked from the sheet's Magie tab.
  'reserveMagiqueMax',
  ...SPHERES.map((s) => `${s.key}Max`),
  ...DISCIPLINES.map((d) => d.key),
];
