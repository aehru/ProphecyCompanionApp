// Élu — a character chosen by a Great Dragon, and the Faveurs their Lien grants.
//
// `characters.chosenBy` (dragon key, NULL = not an Élu) and `characters.bond`
// (0–5) are all that is stored. Faveur N is granted at Lien N and KEPT, so what
// a character can do is every Faveur up to their Lien — the same cumulative
// reading as `rungsUpTo` in lib/statut. Plain scans: the catalogue is a few
// dozen rows.

import { ATTRIBUT_LABEL, CARACTERISTIQUES, DRAGON_LABEL, timeUnitLabel } from '@/constants/prophecy';
import { FAVOR_CATALOG, type FavorPreset } from '@/data/favor-catalog';
import { type FormulaVars, spellFormulaResult } from '@/lib/formula';

type Dragon = string | null | undefined;

/** A dragon's five Faveurs, ascending. Empty for one not typed in yet. */
export const favorsForDragon = (dragon: Dragon): FavorPreset[] =>
  dragon ? FAVOR_CATALOG.filter((f) => f.dragon === dragon) : [];

/** Every Faveur an Élu holds: 1 through their Lien. Empty when not an Élu. */
export function favorsUpTo(dragon: Dragon, bond: number | null | undefined): FavorPreset[] {
  if (!dragon || !bond) return [];
  return favorsForDragon(dragon).filter((f) => f.niveau <= bond);
}

/** « Élu de Brorne », or null when the character is not an Élu. */
export const eluLabel = (dragon: Dragon) =>
  dragon ? `Élu de ${DRAGON_LABEL[dragon] ?? dragon}` : null;

const CARAC_LABEL = Object.fromEntries(CARACTERISTIQUES.map((c) => [c.key, c.label]));

/**
 * « Mental + Volonté · Difficulté 10 » / « Empathie + Vie en cité · … » — in
 * the rulebook's own order: attribut first, compétence last. Null with no roll.
 */
export function favorRollLabel(f: FavorPreset): string | null {
  if (!f.roll) return null;
  const { attribut, carac, skill, difficulty } = f.roll;
  const c = CARAC_LABEL[carac] ?? carac;
  const pair = attribut ? `${ATTRIBUT_LABEL[attribut] ?? attribut} + ${c}` : `${c} + ${skill}`;
  return `${pair} · Difficulté ${difficulty}`;
}

/**
 * « 3 + NR tours », « 4 tours » once the tendance is known. `vars` is the
 * formula bag — pass `tendance` from a character, nothing from the catalogue.
 */
export function favorDurationLabel(f: FavorPreset, vars: FormulaVars = {}): string | null {
  const value = spellFormulaResult(f.duration, vars);
  if (!value) return null;
  // The same rendering as a spell's durée (SpellDetail): singular at 1.
  return `${value} ${timeUnitLabel(f.durationUnit ?? '', Number(value) || null)}`.trim();
}
