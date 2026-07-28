// Armor taxonomy: weight categories.
//
// Lives in its OWN module (not next to the catalogue) for the same reason as
// `weapon-constants.ts`: `scripts/build-catalogs.ts` imports it as a VALUE
// while generating `armor-catalog.gen.ts`, and `src/db/schema.ts` imports the
// type. If it sat in `armor-catalog.ts` (which re-exports the generated
// file), both would need the generator's own output to load.
//
// App code can keep importing it from `@/data/armor-catalog`, which re-exports
// this module.

export type ArmorCategory = 'Armures légères' | 'Armures moyennes' | 'Armures lourdes';

export const ARMOR_CATEGORIES: ArmorCategory[] = [
  'Armures légères',
  'Armures moyennes',
  'Armures lourdes',
];
