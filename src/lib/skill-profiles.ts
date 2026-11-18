// PROFILS PAR CASTE — the compétences every member of a caste starts with
// (« Compétences de base », scored 6 / 6 / 5 / 5 / 4) and the ones it is
// advised to develop (« Compétences libres recommandées »).
//
// A profile is five SLOTS, one per score. A slot lists the options it may be
// filled with — one compétence, a choice (« Baratin ou Séduction »), « une
// Compétence d'Armes parmi … », or a magic score. Names are the app's own
// (`DEFAULT_SKILLS`), not the book's spelling: « Acrobaties », « Equitation »,
// « Art de la scène ». `skill-profiles.test.ts` fails on any name that is not
// in the skill list, so a typo here cannot silently offer nothing.
//
// Magic is not a skill row in the app: a Discipline is a character column
// (`magieInvocatoire`…) and a Sphère another (`sphereFeu` → `sphereFeuMax`).
// They ride in the same lists as `discipline:<key>` / `sphere:<key>` ids, so a
// slot can mix them with compétences (the Mage's « Arts de la scène ou Don
// artistique ou une Discipline de magie »).

import {
  type CasteKey,
  DEFAULT_SKILLS,
  DISCIPLINES,
  SPHERES,
} from '@/constants/prophecy';

/** The base scores, one per slot. */
export const PROFILE_VALUES = [6, 6, 5, 5, 4] as const;

const ALL_DISCIPLINES = DISCIPLINES.map((d) => `discipline:${d.key}`);
const ALL_SPHERES = SPHERES.map((s) => `sphere:${s.key}`);

/** « une Compétence d'Armes parmi : … », by the book's own adjectives. */
const W = {
  articulees: 'Armes articulées',
  choc: 'Armes de choc',
  contondantes: 'Armes contondantes',
  jet: 'Armes de jet',
  doubles: 'Armes doubles',
  hast: "Armes d'hast",
  tranchantes: 'Armes tranchantes',
  projectiles: 'Armes à projectiles',
} as const;

/** « toutes les Compétences d'Armes de la catégorie Combat ». */
const COMBAT_SKILLS = DEFAULT_SKILLS.slice(
  0,
  DEFAULT_SKILLS.findIndex((s) => s.name === 'Corps à corps') + 1,
).map((s) => s.name);

export type SkillProfile = {
  /** Five slots, in PROFILE_VALUES order of the book's list; each is its options. */
  slots: readonly (readonly string[])[];
  recommended: readonly string[];
};

export const CASTE_SKILL_PROFILES: Record<CasteKey, SkillProfile> = {
  artisan: {
    slots: [
      ['Connaissance des animaux', 'Dressage', 'Matières premières'],
      [W.articulees, W.contondantes, W.jet, W.tranchantes],
      ['Don artistique', 'Marchandage'],
      // « Deux Compétences d'Artisanat »: the app has two, so one slot each.
      ['Artisanat', 'Artisanat élémentaire'],
      ['Artisanat', 'Artisanat élémentaire'],
    ],
    recommended: [
      'Alchimie',
      'Baratin',
      'Castes',
      'Connaissance de la magie',
      'Contrefaçon',
      ...ALL_DISCIPLINES,
      'Estimation',
      'Lois',
      ...ALL_SPHERES,
    ],
  },
  combattant: {
    slots: [
      ['Bouclier', W.articulees, W.choc, W.contondantes, W.jet, W.tranchantes],
      [W.articulees, W.choc, W.contondantes, W.jet, W.doubles, W.tranchantes],
      ['Artisanat', 'Corps à corps'],
      ['Athlétisme', 'Commandement'],
      ['Esquive'],
    ],
    recommended: [
      'Armes de siège',
      'Attelages',
      'Connaissance des animaux',
      'Dressage',
      'Eloquence',
      'Equitation',
      'Jeu',
      'Natation',
      'Premiers soins',
      'Stratégie',
      ...COMBAT_SKILLS,
    ],
  },
  commercant: {
    slots: [
      ['Baratin', 'Séduction'],
      ['Estimation'],
      ['Géographie', 'Vie en cité'],
      ['Lire et écrire'],
      ['Marchandage'],
    ],
    recommended: [
      'Attelages',
      'Castes',
      'Contrefaçon',
      'Déguisement',
      'Diplomatie',
      'Discrétion',
      'Faire les poches',
      'Histoire',
      'Jeu',
      'Lois',
      'Matières premières',
      'Orientation',
      'Psychologie',
    ],
  },
  erudit: {
    slots: [
      ['Connaissance de la magie', 'Connaissance des dragons'],
      ['Castes'],
      ['Diplomatie', 'Psychologie'],
      ['Géographie', 'Histoire', 'Lois'],
      ['Lire et écrire'],
    ],
    recommended: [
      'Alchimie',
      'Astrologie',
      'Conte',
      'Don artistique',
      'Herboristerie',
      'Médecine',
      'Premiers soins',
    ],
  },
  mage: {
    slots: [
      ['Corps à corps', W.articulees, W.contondantes, W.tranchantes],
      ['Art de la scène', 'Don artistique', ...ALL_DISCIPLINES],
      ['Connaissance de la magie'],
      ALL_DISCIPLINES,
      ALL_SPHERES,
    ],
    recommended: [
      'Acrobaties',
      'Artisanat',
      'Athlétisme',
      'Connaissance des dragons',
      'Esquive',
      'Histoire',
      'Intimidation',
      'Jongler',
      'Marchandage',
      'Matières premières',
    ],
  },
  prodige: {
    slots: [
      [W.doubles, 'Corps à corps'],
      ['Connaissance des dragons'],
      ['Esquive'],
      ['Herboristerie', 'Médecine'],
      ['Premiers soins'],
    ],
    recommended: [
      'Acrobaties',
      'Athlétisme',
      'Castes',
      'Commandement',
      'Connaissance des animaux',
      'Diplomatie',
      ...ALL_DISCIPLINES,
      'Discrétion',
      'Dressage',
      'Eloquence',
      'Histoire',
      'Intimidation',
      'Jongler',
      'Pister',
      'sphere:sphereNature',
    ],
  },
  protecteur: {
    slots: [
      [W.articulees, W.choc, W.contondantes, W.hast, W.doubles, W.tranchantes],
      ['Athlétisme', 'Equitation'],
      ['Bouclier'],
      ['Castes', 'Stratégie'],
      ['Commandement', 'Lois'],
    ],
    recommended: [
      'Armes de siège',
      'Artisanat',
      'Corps à corps',
      'Diplomatie',
      'Eloquence',
      'Esquive',
      'Histoire',
      'Intimidation',
      'Jeu',
      'Lire et écrire',
      'Vie en cité',
    ],
  },
  voyageur: {
    slots: [
      [W.projectiles, W.articulees, W.contondantes, W.jet, W.tranchantes],
      ['Athlétisme', 'Attelages', 'Equitation'],
      ['Cartographie', 'Conte'],
      ['Géographie'],
      ['Orientation'],
    ],
    recommended: [
      'Acrobaties',
      'Artisanat',
      'Astrologie',
      'Connaissance des animaux',
      'Déguisement',
      'Diplomatie',
      'Discrétion',
      'Dressage',
      'Escalade',
      'Esquive',
      'Faire les poches',
      'Herboristerie',
      'Histoire',
      'Jeu',
      'Jongler',
      'Marchandage',
      'Natation',
      'Pièges',
      'Pister',
      'Premiers soins',
    ],
  },
};

/** A caste's profile, or null for « Sans Caste » (and an unknown key). */
export function skillProfile(caste: string | null | undefined): SkillProfile | null {
  return caste ? (CASTE_SKILL_PROFILES[caste as CasteKey] ?? null) : null;
}

// ── Option ids: compétence names and magic scores ──────────────────────────

const DISCIPLINE_LABEL = Object.fromEntries(DISCIPLINES.map((d) => [d.key, d.label]));
const SPHERE_LABEL = Object.fromEntries(SPHERES.map((s) => [s.key, s.label]));

/** Every id a profile or the free points may name: the skills, then the magic. */
export const SKILL_OPTION_IDS: readonly string[] = [
  ...DEFAULT_SKILLS.map((s) => s.name),
  ...ALL_DISCIPLINES,
  ...ALL_SPHERES,
];

/** How an option reads: the skill's name, « Discipline : Invocatoire », « Sphère : Feu ». */
export function optionLabel(id: string): string {
  const [kind, key] = id.split(':');
  if (kind === 'discipline' && key) return `Discipline : ${DISCIPLINE_LABEL[key] ?? key}`;
  if (kind === 'sphere' && key) return `Sphère : ${SPHERE_LABEL[key] ?? key}`;
  return id;
}

/**
 * The form field a magic option writes to — a Discipline is its own column, a
 * Sphère its `…Max` — or null for a compétence (which becomes a `skills` row).
 */
export function magicField(id: string): string | null {
  const [kind, key] = id.split(':');
  if (kind === 'discipline' && key) return key;
  if (kind === 'sphere' && key) return `${key}Max`;
  return null;
}
