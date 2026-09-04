// The avantages / désavantages point pool.
//
// One rule, and it is the whole feature: a désavantage GRANTS points and an
// avantage SPENDS them, so what the sheet shows is the balance between the two
// halves of `traits`. Costs are stored as positive magnitudes on both sides (see
// the `traits` doc comment in db/schema.ts) — the sign lives in `kind`, which is
// what lets this be a subtraction instead of a sum over trusted signs.
//
// Nothing here enforces anything. The rulebook's quotas (« un Ancien prend deux
// Communs et un Rare ») and the age minimums are not modelled: they need a
// character age the sheet does not record, and they belong to a creation flow
// this app does not have yet. A negative balance is therefore a legitimate
// state — the player overspent, the app says so and lets them fix it.

import type { TraitKind } from '@/constants/prophecy';

/** The two columns a pool is computed from. Any row shape carrying them works. */
export type TraitPoolRow = { kind: TraitKind; cost: number };

export interface TraitPool {
  /** Points granted by the désavantages. */
  gained: number;
  /** Points spent on the avantages. */
  spent: number;
  /** `gained - spent`. Positive = points left to spend, negative = a debt. */
  balance: number;
}

/**
 * Add up both halves. Negative costs are ignored rather than subtracted: a row
 * can only get one through a hand-edited import file, and letting it through
 * would make a désavantage quietly take points AWAY — the opposite of what the
 * row says it does.
 */
export function traitPool(rows: readonly TraitPoolRow[]): TraitPool {
  let gained = 0;
  let spent = 0;
  for (const row of rows) {
    const cost = Math.max(0, row.cost);
    if (row.kind === 'desavantage') gained += cost;
    else spent += cost;
  }
  return { gained, spent, balance: gained - spent };
}

/**
 * What a catalogue row says about an entry the character already took:
 * « Déjà ajouté » once, « Déjà ajouté ×2 » beyond, nothing at zero.
 *
 * A COUNT and not a flag because several entries are explicitly « peut survenir
 * plusieurs fois » (Dette, Ennemi, Interdit, Maladie): a plain « Déjà ajouté »
 * on a second Dette would read as a warning against doing what the rulebook
 * allows.
 */
export function traitOwnedBadge(count: number | undefined): string | undefined {
  if (!count || count < 1) return undefined;
  return count > 1 ? `Déjà ajouté ×${count}` : 'Déjà ajouté';
}

/**
 * Costs more than the character has left to spend — the catalogue flags it, and
 * nothing more: the pool is enforced nowhere else either, and a player who
 * overspends on purpose is doing something they settle with their GM.
 *
 * Désavantages are never unaffordable — they GRANT points, so there is nothing
 * to be short of — and the CHEAPEST tier decides: an entry offered at 1, 2 or 3
 * is still affordable at 1 with two points left. With no pool (the catalogue
 * read outside any character) nothing is flagged.
 */
export function traitUnaffordable(
  entry: { kind: TraitKind; costs: readonly number[] },
  pool?: TraitPool,
): boolean {
  if (!pool || entry.kind !== 'avantage' || entry.costs.length === 0) return false;
  return Math.min(...entry.costs) > pool.balance;
}

/**
 * Whether a price list is a run of consecutive values — « 1, 2, 3, 4 » rather
 * than the rulebook's own tiers « 1, 3, 5 ». Sorted ascending by the generator,
 * so neighbours are enough to tell.
 */
function isContiguous(costs: readonly number[]): boolean {
  return costs.every((c, i) => i === 0 || c === costs[i - 1] + 1);
}

/**
 * Long enough that spelling the values out stops helping. Four is where « 1, 2,
 * 3 ou 4 points » becomes worse than « de 1 à 4 points », and it leaves the
 * rulebook's real tier lists (1/2, 1/3/5, 3/5) reading as tiers.
 */
const COST_RANGE_MIN = 4;

/**
 * « 2 points » / « 1, 2 ou 3 points » / « de 1 à 50 points » — one price, or the
 * whole set a catalogue entry offers. French list punctuation (« ou » before the
 * last), because this reads inside a sentence-like meta line rather than as a
 * field value; a long unbroken run collapses to its bounds instead, which is
 * what « Fortune personnelle » (priced *variable* in the book) needs.
 */
export function traitCostLabel(costs: readonly number[]): string {
  if (costs.length === 0) return '';
  const unit = costs[costs.length - 1] > 1 || costs.length > 1 ? 'points' : 'point';
  if (costs.length === 1) return `${costs[0]} ${unit}`;
  if (costs.length >= COST_RANGE_MIN && isContiguous(costs)) {
    return `de ${costs[0]} à ${costs[costs.length - 1]} ${unit}`;
  }
  return `${costs.slice(0, -1).join(', ')} ou ${costs[costs.length - 1]} ${unit}`;
}

