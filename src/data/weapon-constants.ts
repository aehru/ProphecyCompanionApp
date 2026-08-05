// Weapon taxonomy: categories, handedness and the handedness → column mapping.
//
// These live in their OWN module (not next to the catalogue) because
// `scripts/build-catalogs.ts` imports them as VALUES while generating
// `weapon-catalog.gen.ts`. If they sat in `weapon-catalog.ts` — which re-exports
// the generated file — the generator would need its own output to run, and a
// missing/broken .gen file would make the build unrecoverable.
//
// App code can keep importing them from `@/data/weapon-catalog`, which re-exports
// this module.

export type WeaponCategory =
  | 'Armes tranchantes'
  | 'Armes de choc'
  | 'Armes contondantes'
  | 'Armes articulées'
  | 'Armes doubles'
  | 'Armes de corps à corps'
  | "Armes d'hast"
  | 'Armes de jet'
  | 'Armes à projectile'
  | 'Armes mécaniques';

export type WeaponHands = 'Une main' | 'Deux mains';

export const WEAPON_CATEGORIES: WeaponCategory[] = [
  'Armes tranchantes',
  'Armes de choc',
  'Armes contondantes',
  'Armes articulées',
  'Armes doubles',
  'Armes de corps à corps',
  "Armes d'hast",
  'Armes de jet',
  'Armes à projectile',
  'Armes mécaniques',
];

export const WEAPON_HANDS: WeaponHands[] = ['Une main', 'Deux mains'];

/**
 * Which compétence a weapon of each category is used with — the skill whose
 * total (attribut + points + modificateurs) is the attack roll base. Values are
 * `DEFAULT_SKILLS` names, not categories: the two vocabularies are close but
 * NOT the same, because a category is a picker taxonomy and a skill is a rules
 * object.
 *   - « Armes de corps à corps » (poings, dagues, katars) → « Corps à corps ».
 *   - « Armes à projectile » (singular, a category) → « Armes à projectiles »
 *     (plural, the skill) — and it hangs off MANUEL, not physique.
 *   - « Armes mécaniques » (arbalètes, lance-harpon) has its own skill,
 *     « Armes mécanique » — singular where the category is plural, manuel too.
 *
 * The generator resolves this at BUILD time into each preset's `skillName`, so
 * the category itself is never stored on a weapon row. A weapon the player
 * creates by hand starts with no skill and gets one picked in the editor; that
 * per-row value is also what a spécialisation override writes.
 */
export const CATEGORY_SKILL: Record<WeaponCategory, string> = {
  'Armes tranchantes': 'Armes tranchantes',
  'Armes de choc': 'Armes de choc',
  'Armes contondantes': 'Armes contondantes',
  'Armes articulées': 'Armes articulées',
  'Armes doubles': 'Armes doubles',
  'Armes de corps à corps': 'Corps à corps',
  "Armes d'hast": "Armes d'hast",
  'Armes de jet': 'Armes de jet',
  'Armes à projectile': 'Armes à projectiles',
  'Armes mécaniques': 'Armes mécanique',
};

/**
 * Map the catalogue's readable handedness label to the schema value stored on
 * the weapon (`weapons.hands`: 1 = one-handed, 2 = two-handed).
 */
export const HAND_VALUE: Record<WeaponHands, 1 | 2> = {
  'Une main': 1,
  'Deux mains': 2,
};
