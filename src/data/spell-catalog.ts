import type { NewSpell } from '@/db/schema';

/**
 * A pickable spell template. `data` is spread into `createSpell` (minus the
 * character link), so its keys mirror the `spells` table columns.
 *
 * The catalogue itself is AUTHORED AS A SPREADSHEET: edit `data-src/spells.csv`
 * (Excel, séparateur « ; ») then run `bun run build:catalogs` — the script
 * validates every row (disciplines/sphères/unités checked against the app's
 * constants) and regenerates `spell-catalog.gen.ts`. Never edit the .gen file.
 */
export type SpellPreset = {
  /** Stable slug (used as list key). */
  id: string;
  data: Omit<NewSpell, 'characterId' | 'id'>;
};

export { SPELL_CATALOG_DATA as SPELL_CATALOG } from './spell-catalog.gen';
