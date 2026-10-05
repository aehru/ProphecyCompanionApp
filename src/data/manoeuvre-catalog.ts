import type { ManoeuvreContext, ManoeuvreFamily } from '@/constants/prophecy';
import type { ManoeuvreRating } from '@/lib/manoeuvre';

/**
 * One combat manœuvre (or combat rule), as the rulebook prints it in one context.
 *
 * **Stored PER CONTEXT**, like the privilèges per caste: « Assommer » exists in
 * the mêlée chapter (dommages « possibles ») and in the corps à corps one
 * (dommages « aucun »), so the context is part of the entry and `id` is prefixed
 * with it (`melee-assommer`, `cac-assommer`).
 *
 * Reference only: nothing is copied onto a character, a player can only STAR an
 * entry (the `favorites` table, kind `manoeuvre`).
 *
 * The catalogue is AUTHORED AS A SPREADSHEET: edit `data-src/manoeuvres.csv`
 * (Excel, séparateur « ; ») then run `bun run build:catalogs`. Never edit the
 * .gen file.
 */
export type ManoeuvrePreset = {
  /** Stable slug, context-prefixed so the two « Assommer » don't collide. */
  id: string;
  contexte: ManoeuvreContext;
  famille: ManoeuvreFamily;
  nom: string;
  /**
   * The four-line block (Difficulté / Esquive / Parade / Dommages). Absent on a
   * rule the rulebook prints without one (« La parade », « Le combat au sol »).
   * Dommages stay prose: the book has no grammar for them (« la Force s'ajoute
   * aux dommages », « normaux, −X à l'Indice de protection »).
   */
  stats?: {
    difficulty: ManoeuvreRating;
    dodge: ManoeuvreRating;
    parry: ManoeuvreRating;
    damage: string;
  };
  /** The opposition roll, as prose — « Manuel + Compétence d'arme contre … ». */
  roll?: string;
  /** The mechanical half EXTRACTED from `description`, same contract as the spells'. */
  inGameEffect?: string;
  /** The rulebook paragraph, verbatim — the source of truth, never rewritten. */
  description: string;
};

export { MANOEUVRE_CATALOG_DATA as MANOEUVRE_CATALOG } from './manoeuvre-catalog.gen';
