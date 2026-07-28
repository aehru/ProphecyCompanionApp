import type { NewShield } from '@/db/schema';

/**
 * A pickable shield template. `data` is spread into `createShield` (minus the
 * character link and runtime-only fields), so its keys mirror the `shields`
 * table columns. No category — shields are one kind (unlike armor's three
 * weight classes).
 *
 * The catalogue itself is AUTHORED AS A SPREADSHEET: edit `data-src/shield.csv`
 * (Excel, séparateur « ; ») then run `bun run build:catalogs` — the script
 * validates every row and regenerates `shield-catalog.gen.ts`. Never edit the
 * .gen file.
 */
export type ShieldPreset = {
  /** Stable slug (used as list key). */
  id: string;
  data: Omit<NewShield, 'characterId' | 'id' | 'defenseCurrent' | 'equipped'>;
};

export { SHIELD_CATALOG_DATA as SHIELD_CATALOG } from './shield-catalog.gen';
