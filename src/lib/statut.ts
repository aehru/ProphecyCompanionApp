// Statut — a character's rung inside their caste (« Statuts et expérience »).
//
// `characters.statut` stores a NUMBER (0–5) and nothing else; everything a rung
// says lives in the generated catalogue, looked up by (caste, niveau). So this
// module is the whole feature's logic: a lookup, and the two ways a Statut gets
// written down.
//
// A Statut only exists INSIDE a caste. « Sans Caste » (a NULL `caste`) has none,
// and neither does a level of 0 — the state of a fresh character and of every
// sheet made before the column existed.
//
// A character sworn to Kalimsshar (`characters.darkOrders`) climbs the caste's
// BLACK ladder instead — « Apprenti noir » and so on. A caste the catalogue has
// no black ladder for (the Prodiges, so far) falls back to the normal one: the
// flag says who the character serves, not that their Statut vanishes.
//
// Plain scans over the array, no index: the catalogue is forty rows and there is
// nothing to search — the spellbook's folded maps exist because 300+ rulebook
// paragraphs were being re-normalized per keystroke, which is not this.

import type { CasteKey } from '@/constants/prophecy';
import { STATUS_CATALOG, type StatutPreset } from '@/data/status-catalog';

type Caste = CasteKey | string | null | undefined;

/**
 * The rung a character is at, or null — for « Sans Caste », for a level of 0,
 * and for a caste the catalogue does not carry. All three are normal states,
 * not errors.
 */
export function statutFor(
  caste: Caste,
  niveau: number | null | undefined,
  darkOrders = false,
): StatutPreset | null {
  if (!caste || !niveau) return null;
  return statutsForCaste(caste, darkOrders).find((s) => s.niveau === niveau) ?? null;
}

/**
 * A caste's whole ladder, ascending — the black one for `darkOrders` when the
 * catalogue has it, the normal one otherwise. Empty for a caste it lacks.
 */
export function statutsForCaste(caste: Caste, darkOrders = false): StatutPreset[] {
  if (darkOrders) {
    const black = ladder(caste, true);
    if (black.length > 0) return black;
  }
  return ladder(caste, false);
}

/**
 * Exactly one ladder, no fallback — the black one is empty for a caste that has
 * none. For the catalogue, which lists both; a character reads
 * {@link statutsForCaste}.
 */
export function ladder(caste: Caste, darkOrders: boolean): StatutPreset[] {
  if (!caste) return [];
  // The generator emits the catalogue sorted by caste, ladder, then niveau, so a
  // filter preserves the reading order with nothing to sort here.
  return STATUS_CATALOG.filter((s) => s.caste === caste && !!s.darkOrders === darkOrders);
}

/**
 * Every rung the character has CLIMBED, ascending: 1 through their Statut.
 *
 * A rung's bénéfice and its Technique are kept for good once reached — a
 * Maître d'armes still has the Apprenti's « L'œil du maître » — so both lists
 * on the character home read through here rather than off the current rung
 * alone. Empty at Statut 0, for « Sans Caste », and for a caste the catalogue
 * does not carry.
 */
export function rungsUpTo(
  caste: Caste,
  niveau: number | null | undefined,
  darkOrders = false,
): StatutPreset[] {
  if (!caste || !niveau) return [];
  return statutsForCaste(caste, darkOrders).filter((s) => s.niveau <= niveau);
}

/** The rulebook writes a Statut in Roman numerals (« III° Statut »). */
const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V'];

/** `3` → « III ». Out-of-range levels print as plain digits rather than nothing. */
export const statutRoman = (niveau: number) => ROMAN[niveau] ?? String(niveau);

/** How a rung is written down everywhere: « III · Artisan ». */
export const rungLabel = (rung: StatutPreset) => `${statutRoman(rung.niveau)} · ${rung.nom}`;

/**
 * How a character's Statut reads on a chip — {@link rungLabel}, or the numeral
 * alone when the catalogue has no such rung: the NUMBER is a fact the player
 * entered and must show either way, where the name is the catalogue's to supply.
 * Null when there is no Statut at all, so a caller renders nothing.
 */
export function statutLabel(
  caste: Caste,
  niveau: number | null | undefined,
  darkOrders = false,
): string | null {
  if (!caste || !niveau) return null;
  const rung = statutFor(caste, niveau, darkOrders);
  return rung ? rungLabel(rung) : statutRoman(niveau);
}
