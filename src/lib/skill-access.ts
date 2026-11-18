// Compétences RÉSERVÉES (to some castes) and INTERDITES (by the Dragons).
// Both cost double at creation: a réservée for anyone outside its castes, an
// interdite for everyone — and an interdite also needs the « Art interdit »
// avantage, which the wizard FLAGS rather than enforces, like the budget.
//
// Keyed by option id (`skill-profiles`): a compétence's app name, or the magic
// ids. `skill-access.test.ts` fails on a name the app does not know.

import type { CasteKey } from '@/constants/prophecy';
import { ALL_DISCIPLINES, ALL_SPHERES } from '@/lib/skill-profiles';

const NATURE = 'sphere:sphereNature';

export const RESERVED_SKILLS: Record<string, readonly CasteKey[]> = {
  Alchimie: ['artisan', 'erudit'],
  'Armes à projectiles': ['voyageur'],
  'Armes de siège': ['combattant', 'protecteur'],
  'Armes doubles': ['protecteur', 'prodige'],
  Artisanat: ['artisan', 'combattant'],
  Astrologie: ['erudit'],
  Cartographie: ['erudit', 'voyageur'],
  Commandement: ['combattant', 'protecteur'],
  'Connaissance de la magie': ['mage', 'prodige'],
  'Connaissance des dragons': ['erudit', 'prodige'],
  Conte: ['erudit', 'voyageur'],
  Contrefaçon: ['artisan', 'commercant'],
  Déverrouillage: ['artisan', 'commercant'],
  ...Object.fromEntries(ALL_DISCIPLINES.map((id) => [id, ['mage'] as const])),
  Dressage: ['artisan', 'prodige', 'voyageur'],
  'Faire les poches': ['commercant', 'voyageur'],
  Géographie: ['commercant', 'erudit', 'voyageur'],
  Herboristerie: ['erudit', 'prodige', 'voyageur'],
  Histoire: ['erudit'],
  'Lire et écrire': ['commercant', 'erudit'],
  Lois: ['erudit', 'protecteur'],
  Marchandage: ['artisan', 'commercant'],
  'Matières premières': ['artisan'],
  Médecine: ['erudit', 'prodige'],
  Orientation: ['prodige', 'voyageur'],
  Pièges: ['artisan', 'voyageur'],
  // « Sphères » for mages — the Nature one for prodiges too.
  ...Object.fromEntries(ALL_SPHERES.map((id) => [id, id === NATURE ? ['mage', 'prodige'] : ['mage']])),
  Stratégie: ['combattant', 'protecteur'],
  Survie: ['voyageur'],
  'Vie en cité': ['commercant', 'protecteur'],
};

export const FORBIDDEN_SKILLS: ReadonlySet<string> = new Set([
  'Armes mécanique',
  'Chirurgie',
  'Explosifs',
  'Mécanismes',
]);

export type SkillAccess = 'reservee' | 'interdite' | null;

/** How a compétence stands for this caste: open (null), réservée to others, or interdite. */
export function skillAccess(id: string, caste: string): SkillAccess {
  if (FORBIDDEN_SKILLS.has(id)) return 'interdite';
  const castes = RESERVED_SKILLS[id];
  return castes && !castes.includes(caste as CasteKey) ? 'reservee' : null;
}

/** The creation price multiplier: ×2 for a réservée outside its castes or an interdite. */
export const skillCostFactor = (id: string, caste: string) => (skillAccess(id, caste) ? 2 : 1);
