import type { NewArmor } from '@/db/schema';

import type { ArmorCategory } from './armor-constants';

/**
 * A pickable armor template. `data` is spread into `createArmor` (minus the
 * character link and runtime-only fields), so its keys mirror the `armor`
 * table columns.
 *
 * The catalogue itself is AUTHORED AS A SPREADSHEET: edit `data-src/armor.csv`
 * (Excel, séparateur « ; ») then run `bun run build:catalogs` — the script
 * validates every row and regenerates `armor-catalog.gen.ts`. Never edit the
 * .gen file.
 */
export type ArmorPreset = {
  /** Stable slug (used as list key). */
  id: string;
  category: ArmorCategory;
  data: Omit<NewArmor, 'characterId' | 'id' | 'defenseCurrent' | 'equipped'>;
};

// The taxonomy lives in `armor-constants` so the CSV build script can import it
// without loading the file it generates — see the note there.
export { ARMOR_CATEGORIES, type ArmorCategory } from './armor-constants';

export { ARMOR_CATALOG_DATA as ARMOR_CATALOG } from './armor-catalog.gen';
