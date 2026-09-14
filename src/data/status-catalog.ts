import type { CasteKey } from '@/constants/prophecy';

/**
 * One rung of a caste's Statut ladder (« Statuts et expérience »), 1 through 5.
 *
 * Unlike every other catalogue here, nothing is ever COPIED onto a character:
 * `characters.statut` stores the level number alone and the text is looked up by
 * (caste, niveau) at render time. So there is no `id`, no `revision` and no
 * provenance — the pair IS the identity, and a rulebook correction reaches every
 * sheet the moment the CSV is regenerated. Nothing to propagate, nothing to
 * fingerprint.
 *
 * The catalogue is AUTHORED AS A SPREADSHEET: edit `data-src/statuses.csv`
 * (Excel, séparateur « ; ») then run `bun run build:catalogs`. Never edit the
 * .gen file.
 */
export type StatutPreset = {
  caste: CasteKey;
  /** 1–5. `characters.statut` 0 means « aucun Statut » and matches no entry. */
  niveau: number;
  /** « Compagnon », « Maître d'armes » — the rung's own name. */
  nom: string;
  /**
   * What the rulebook asks for, VERBATIM and unparsed — « une Compétence d'arme
   * à 6, Physique à 4 ». Deliberately prose and not a structured requirement:
   * half of it names no particular column (« une Compétence d'arme » is any of
   * them, « 40 points dans les Compétences Physiques » is a sum) and a third of
   * it counts Privilèges de caste, a system the app does not model. The player
   * reads the line; the app checks nothing.
   */
  requis: string;
  /** The rung's bénéfice(s), as one paragraph — some levels grant two. */
  benefice: string;
  /**
   * The named power the rulebook prints in italics under the bénéfice («  L'œil
   * du maître », « La force du rouage »). Its own field rather than more prose
   * in `benefice` because it is the thing a player at this Statut actually looks
   * up mid-game. Null where a rung has none.
   */
  technique: { nom: string; effet: string } | null;
  /**
   * The rulebook's asterisk, attached to the LEVEL that carries it (the fifth,
   * so far, and not in every caste) rather than to the caste: one column covers
   * both, and a caste whose footnote hangs off another rung needs no new shape.
   * Empty is the normal case.
   */
  note: string;
  /**
   * A rung of the caste's BLACK ladder (« Les Ordres Noirs », sworn to
   * Kalimsshar). Absent on the normal ladder. So the identity is really
   * (caste, darkOrders, niveau) — see `statutsForCaste`.
   */
  darkOrders?: boolean;
};

export { STATUS_CATALOG_DATA as STATUS_CATALOG } from './status-catalog.gen';
