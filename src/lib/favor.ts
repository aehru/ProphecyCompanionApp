// Élu — a character chosen by a Great Dragon, and the Faveurs their Lien grants.
//
// `characters.chosenBy` (dragon key, NULL = not an Élu) and `characters.bond`
// (0–5) are all that is stored. Faveur N is granted at Lien N and KEPT, so what
// a character can do is every Faveur up to their Lien — the same cumulative
// reading as `rungsUpTo` in lib/statut. Plain scans: the catalogue is a few
// dozen rows.

import { ATTRIBUT_LABEL, CARACTERISTIQUES, DRAGON_LABEL, timeUnitLabel } from '@/constants/prophecy';
import { FAVOR_CATALOG, type FavorPreset } from '@/data/favor-catalog';
import type { CustomFavor, NewCustomFavor } from '@/db/schema';
import { type FormulaVars, parseFormula, spellFormulaResult } from '@/lib/formula';

type Dragon = string | null | undefined;

/**
 * A dragon's Faveurs, ascending by niveau: the rulebook's five, with any `house`
 * (« Maison ») entries of that dragon after the rulebook one of their level.
 * Empty for a dragon not typed in yet and with no house entry.
 */
export function favorsForDragon(dragon: Dragon, house: readonly FavorPreset[] = []): FavorPreset[] {
  if (!dragon) return [];
  // Stable sort: within a niveau the rulebook leads, house entries follow in order.
  return [...FAVOR_CATALOG, ...house]
    .filter((f) => f.dragon === dragon)
    .sort((a, b) => a.niveau - b.niveau);
}

/**
 * Every Faveur an Élu holds: 1 through their Lien. Empty when not an Élu.
 * `house` is the « Maison » entries THIS Élu opted into — kept alongside the
 * rulebook ones under the same Lien rule.
 */
export function favorsUpTo(
  dragon: Dragon,
  bond: number | null | undefined,
  house: readonly FavorPreset[] = [],
): FavorPreset[] {
  if (!dragon || !bond) return [];
  return favorsForDragon(dragon, house).filter((f) => f.niveau <= bond);
}

/** A rulebook Faveur's identity — what a house variant records as provenance. */
export const favorPresetId = (f: FavorPreset) => f.id ?? `${f.dragon}-${f.niveau}`;

/** A `custom_favors` row read as a catalogue preset, badged by `custom`. */
export function customFavorPreset(row: CustomFavor): FavorPreset {
  const roll = row.roll.trim();
  const duration = row.duration.trim();
  return {
    id: row.id,
    custom: true,
    dragon: row.dragon,
    niveau: row.level,
    nom: row.name.trim() || 'Sans nom',
    description: row.description,
    ...(row.inGameEffect.trim() && { inGameEffect: row.inGameEffect.trim() }),
    ...((roll || row.difficulty != null) && {
      customRoll: { text: roll, difficulty: row.difficulty ?? undefined },
    }),
    ...(row.usages.trim() && { usages: row.usages.trim() }),
    ...(duration && { duration, durationUnit: row.durationUnit ?? undefined }),
  };
}

/** A rulebook Faveur as the starting point of a « Maison » variant. */
export function favorVariantOf(f: FavorPreset): NewCustomFavor {
  return {
    dragon: f.dragon,
    level: f.niveau,
    name: f.nom,
    description: f.description,
    inGameEffect: f.inGameEffect ?? '',
    roll: favorRollPair(f) ?? '',
    difficulty: f.roll?.difficulty ?? f.customRoll?.difficulty ?? null,
    usages: f.usages ?? '',
    duration: f.duration ?? '',
    durationUnit: f.durationUnit ?? null,
    presetId: favorPresetId(f),
  };
}

/** The editor's warning for a durée the formula grammar refuses; null when fine. */
export function favorDurationWarning(raw: string): string | null {
  const parsed = parseFormula(raw, { nr: true, sphere: true, statut: true, tendance: true });
  return parsed.ok ? null : parsed.error;
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
  const pair = favorRollPair(f);
  const difficulty = f.roll?.difficulty ?? f.customRoll?.difficulty;
  const parts = [pair, difficulty != null ? `Difficulté ${difficulty}` : null].filter(Boolean);
  return parts.length ? parts.join(' · ') : null;
}

/** « Mental + Volonté » — the roll without its difficulté. A house one as typed. */
function favorRollPair(f: FavorPreset): string | null {
  if (f.customRoll) return f.customRoll.text || null;
  if (!f.roll) return null;
  const { attribut, carac, skill } = f.roll;
  const c = CARAC_LABEL[carac] ?? carac;
  return attribut ? `${ATTRIBUT_LABEL[attribut] ?? attribut} + ${c}` : `${c} + ${skill}`;
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
