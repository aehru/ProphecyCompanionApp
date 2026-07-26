import type { NewWeapon } from '@/db/schema';

import type { WeaponCategory, WeaponHands } from './weapon-constants';

/**
 * A pickable weapon template. `data` is spread into `createWeapon` (minus the
 * character link), so its keys mirror the `weapons` table columns.
 *
 * The catalogue itself is AUTHORED AS A SPREADSHEET: edit `data-src/weapons.csv`
 * (Excel, séparateur « ; ») then run `bun run build:catalogs` — the script
 * validates every row (formules de dégâts/portée parsées, prérequis, catégories)
 * and regenerates `weapon-catalog.gen.ts`. Never edit the .gen file.
 */
export type WeaponPreset = {
  /** Stable slug (used as list key). */
  id: string;
  category: WeaponCategory;
  /** Subcategory: how many hands the weapon needs. */
  hands: WeaponHands;
  data: Omit<NewWeapon, 'characterId' | 'id'>;
};

// The taxonomy lives in `weapon-constants` so the CSV build script can import it
// without loading the file it generates — see the note there.
export {
  HAND_VALUE,
  WEAPON_CATEGORIES,
  WEAPON_HANDS,
  type WeaponCategory,
  type WeaponHands,
} from './weapon-constants';

export { WEAPON_CATALOG_DATA as WEAPON_CATALOG } from './weapon-catalog.gen';
