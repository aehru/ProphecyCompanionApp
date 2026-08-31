// The polymorphic side of an enchantment, in one place.
//
// `enchants.targetType` + `targetId` point at a weapon, an armour, a shield or
// an item — four tables with no common parent, so there is no FK to follow and
// no single list to look the row up in (see the `enchants` doc comment in
// db/schema). Every screen touching enchants needs the same three answers —
// which list a kind means, which row an enchant is bound to, whether that row is
// currently worn — and each one used to re-derive them, four labels and a
// ternary chain at a time. They live here instead: pure, so they are testable,
// and single, so a fifth enchantable kind is one edit.

import type { Armor, Enchant, EnchantTarget, Item, Shield, Weapon } from '@/db/schema';

/** A row from any of the four enchantable tables. */
export type EnchantTargetRow = Weapon | Armor | Shield | Item;

/** The character's gear, as the screens already hold it. */
export interface EnchantTargetLists {
  weapons: Weapon[];
  armor: Armor[];
  shields: Shield[];
  items: Item[];
}

/** French for each kind — « Arme », « Armure »… (the code stays English). */
export const ENCHANT_TARGET_LABEL: Record<EnchantTarget, string> = {
  weapon: 'Arme',
  armor: 'Armure',
  shield: 'Bouclier',
  item: 'Objet',
};

/**
 * The order the kinds are OFFERED in — armour and shield adjacent, because that
 * is how a player thinks about what they are wearing. Deliberately not
 * `ENCHANT_TARGETS`, which is the schema's enum order (weapon, armor, item,
 * shield) and exists to constrain a column, not to lay out chips. The test keeps
 * the two lists covering the same set, so a fifth enchantable kind can't be
 * added to one and forgotten in the other.
 */
export const ENCHANT_TARGET_ORDER: readonly EnchantTarget[] = ['weapon', 'armor', 'shield', 'item'];

/** The same four, ready for a `<ChipSelect>`. */
export const ENCHANT_TARGET_OPTIONS = ENCHANT_TARGET_ORDER.map((key) => ({
  key,
  label: ENCHANT_TARGET_LABEL[key],
}));

/** The rows one kind means. */
export function targetsOfKind(kind: EnchantTarget, lists: EnchantTargetLists): EnchantTargetRow[] {
  switch (kind) {
    case 'weapon':
      return lists.weapons;
    case 'armor':
      return lists.armor;
    case 'shield':
      return lists.shields;
    case 'item':
      return lists.items;
  }
}

/** The object an enchant is bound to, or undefined if it was deleted under it. */
export function findTarget(
  enchant: Pick<Enchant, 'targetType' | 'targetId'>,
  lists: EnchantTargetLists,
): EnchantTargetRow | undefined {
  return targetsOfKind(enchant.targetType, lists).find((o) => o.id === enchant.targetId);
}

/**
 * Is the object being worn/wielded right now — i.e. is its enchantment in reach?
 * A weapon answers with the hand it is held in, everything else with a boolean;
 * the two column shapes are why this can't just read one field.
 */
export function isTargetEquipped(kind: EnchantTarget, row: EnchantTargetRow): boolean {
  return kind === 'weapon'
    ? (row as Weapon).equippedHand != null
    : (row as Armor | Shield | Item).equipped;
}

/**
 * Something to bind a NEW enchant to: the first object the character owns, any
 * kind, in `ENCHANT_TARGETS` order. Null when they own nothing — which is what
 * disables the add button, since an enchantment with no object is not a thing.
 */
export function firstTarget(
  lists: EnchantTargetLists,
): { type: EnchantTarget; id: number } | null {
  for (const kind of ENCHANT_TARGET_ORDER) {
    const first = targetsOfKind(kind, lists)[0];
    if (first) return { type: kind, id: first.id };
  }
  return null;
}
