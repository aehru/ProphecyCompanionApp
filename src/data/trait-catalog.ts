import type { NewTrait } from '@/db/schema';

/**
 * A pickable avantage / désavantage. `data` is spread into `createTrait` (minus
 * the character link), so its keys mirror the `traits` table columns.
 *
 * The catalogue is AUTHORED AS A SPREADSHEET: edit `data-src/traits.csv` (Excel,
 * séparateur « ; ») then run `bun run build:catalogs`. Never edit the .gen file.
 */
export type TraitPreset = {
  /** Stable slug (used as list key, and stored on the rows picked from it). */
  id: string;
  /**
   * Fingerprint of `data`, `costs` and `precisionPrompt`, computed by the generator
   * (`lib/preset-revision`). A picked trait stores the revision it was copied
   * at, so a later catalogue correction is detectable on the character's row —
   * a re-priced entry included, which is why the costs are hashed too. Never
   * authored by hand.
   */
  revision: string;
  /**
   * What this entry may be taken for, in points — the one field that is NOT
   * part of `data`, because the row stores the single cost the player chose.
   *
   * The rulebook prices entries two ways and this list holds both: explicit
   * tiers (Phobie 1 / 2 / 3) and plain ranges (1 à 5), the latter expanded to
   * every value in it. A single-cost entry is a list of one. Sorted ascending,
   * never empty.
   */
  costs: number[];
  /**
   * What to ask the player when they take this entry — « Nature de l'anomalie »,
   * « Objet de la faiblesse ». Empty on entries that are complete as written.
   *
   * The PROMPT lives here and the ANSWER lives on the row (`traits.note`): the
   * question belongs to the rulebook entry, the answer to one character. Never
   * required — an entry added now and precised later is a normal way to build a
   * character, and the field stays editable afterwards.
   */
  precisionPrompt?: string;
  /**
   * The row payload. No `cost` (chosen at pick time, from `costs`) and no
   * `note` — the note is what the PLAYER writes about their own character's
   * copy of the entry, so the catalogue has nothing to say about it.
   */
  data: Omit<NewTrait, 'characterId' | 'id' | 'cost' | 'note'>;
};

export { TRAIT_CATALOG_DATA as TRAIT_CATALOG } from './trait-catalog.gen';
