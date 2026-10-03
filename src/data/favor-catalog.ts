import type { GreatDragonKey } from '@/constants/prophecy';

/**
 * One Faveur a Great Dragon grants its Élu, at one level of their Lien (1–5).
 *
 * Same contract as `StatutPreset`: nothing is COPIED onto a character.
 * `characters.chosenBy` + `characters.bond` are all that is stored, and Faveur N
 * is looked up by (dragon, niveau) — so (dragon, niveau) IS the identity and a
 * rulebook correction reaches every sheet the moment the CSV is regenerated.
 *
 * Authored as a spreadsheet: edit `data-src/favors.csv` (Excel, séparateur
 * « ; ») then run `bun run build:catalogs`. Never edit the .gen file.
 */
export type FavorPreset = {
  dragon: GreatDragonKey;
  /** 1–5 — the Lien at which the Dragon grants it. */
  niveau: number;
  /** « La peau de pierre ». */
  nom: string;
  /** The rulebook paragraph, verbatim — the source of truth, never rewritten. */
  description: string;
  /** The mechanical half extracted from `description` (as `spells.inGameEffect`). */
  inGameEffect?: string;
  /**
   * The roll the Faveur asks for — a normal test of a caractéristique plus
   * EITHER an attribut (« Mental + Volonté ») or a compétence (« Empathie + Vie
   * en cité »), exactly one of the two. `skill` is a `DEFAULT_SKILLS` name.
   */
  roll?: { carac: string; attribut?: string; skill?: string; difficulty: number };
  /** « 3 par jour, 1 par cible », « illimité ». Prose: nothing counts uses yet. */
  usages?: string;
  /** A `lib/formula` with NR + TENDANCE opted in — « 3 + NR », « TENDANCE_DRAGON ». */
  duration?: string;
  /** A `TIME_UNITS` key, present exactly when `duration` is. */
  durationUnit?: string;
};

export { FAVOR_CATALOG_DATA as FAVOR_CATALOG } from './favor-catalog.gen';
