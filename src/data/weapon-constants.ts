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
 * Map the catalogue's readable handedness label to the schema value stored on
 * the weapon (`weapons.hands`: 1 = one-handed, 2 = two-handed).
 */
export const HAND_VALUE: Record<WeaponHands, 1 | 2> = {
  'Une main': 1,
  'Deux mains': 2,
};
