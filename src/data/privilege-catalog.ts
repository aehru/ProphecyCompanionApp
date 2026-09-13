import type { CasteKey, PrivilegeFamily } from '@/constants/prophecy';

/**
 * One Privilège, as one caste may buy it.
 *
 * **A privilège is stored PER CASTE, not as one entry bound to several.** The
 * same name recurs across castes with a different price and a different family:
 * « Expertise » is an annexe at 4 points for an Artisan and a privilège de caste
 * at 2 for a Commerçant, with identical text. One row carrying a list of castes
 * could not hold two prices, so the caste is part of the entry — and `id` is
 * prefixed with it (`artisan-expertise`, `commercant-expertise`) to stay unique
 * the way every other catalogue's slug is.
 *
 * The catalogue is AUTHORED AS A SPREADSHEET: edit `data-src/privileges.csv`
 * (Excel, séparateur « ; ») then run `bun run build:catalogs`. Never edit the
 * .gen file.
 */
export type PrivilegePreset = {
  /** Stable slug, caste-prefixed so two castes' « Expertise » don't collide. */
  id: string;
  caste: CasteKey;
  /** Which of the caste page's two headings this one sits under. */
  famille: PrivilegeFamily;
  nom: string;
  /**
   * What it costs, in points — the number the rulebook prints in brackets after
   * the name. The CURRENCY is not the avantages' pool: privilèges are paid for
   * separately (XP), which is why nothing here feeds `lib/trait-pool`.
   */
  cout: number;
  /**
   * The rulebook paragraph, verbatim — the source of truth, never rewritten.
   *
   * No `inGameEffect` beside it yet, unlike `traits` and `spells`: the mechanical
   * half is worth extracting once someone reads it mid-game, and nothing reads
   * these mid-game until a character can actually take one. The column can join
   * later without invalidating a single row.
   */
  description: string;
};

export { PRIVILEGE_CATALOG_DATA as PRIVILEGE_CATALOG } from './privilege-catalog.gen';
