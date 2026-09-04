import { describe, expect, it } from 'vitest';

import { ENCHANT_TARGETS, type Armor, type Item, type Shield, type Weapon } from '@/db/schema';
import {
  ENCHANT_TARGET_LABEL,
  ENCHANT_TARGET_OPTIONS,
  ENCHANT_TARGET_ORDER,
  findTarget,
  firstTarget,
  isTargetEquipped,
  targetsOfKind,
  type EnchantTargetLists,
} from '@/lib/enchant-targets';

const weapon = (id: number, equippedHand: string | null = null) =>
  ({ id, name: `arme ${id}`, equippedHand }) as Weapon;
const armor = (id: number, equipped = false) => ({ id, name: `armure ${id}`, equipped }) as Armor;
const shield = (id: number, equipped = false) => ({ id, name: `bouclier ${id}`, equipped }) as Shield;
const item = (id: number, equipped = false) => ({ id, name: `objet ${id}`, equipped }) as Item;

const empty: EnchantTargetLists = { weapons: [], armor: [], shields: [], items: [] };

describe('targetsOfKind', () => {
  it('maps each kind to its own table', () => {
    const lists = { weapons: [weapon(1)], armor: [armor(2)], shields: [shield(3)], items: [item(4)] };
    expect(targetsOfKind('weapon', lists)).toEqual(lists.weapons);
    expect(targetsOfKind('armor', lists)).toEqual(lists.armor);
    expect(targetsOfKind('shield', lists)).toEqual(lists.shields);
    expect(targetsOfKind('item', lists)).toEqual(lists.items);
  });
});

describe('findTarget', () => {
  it('looks the row up in the list its kind names, not by id alone', () => {
    // Same id in two tables: the kind is what disambiguates a polymorphic pointer.
    const lists = { ...empty, weapons: [weapon(7)], items: [item(7)] };
    expect(findTarget({ targetType: 'item', targetId: 7 }, lists)).toBe(lists.items[0]);
    expect(findTarget({ targetType: 'weapon', targetId: 7 }, lists)).toBe(lists.weapons[0]);
  });

  it('returns undefined when the object was deleted under the enchant', () => {
    expect(findTarget({ targetType: 'weapon', targetId: 99 }, empty)).toBeUndefined();
  });
});

describe('isTargetEquipped', () => {
  it('reads a weapon by the hand it is held in', () => {
    expect(isTargetEquipped('weapon', weapon(1, 'main'))).toBe(true);
    expect(isTargetEquipped('weapon', weapon(1, null))).toBe(false);
  });

  it('reads everything else by its boolean', () => {
    expect(isTargetEquipped('armor', armor(1, true))).toBe(true);
    expect(isTargetEquipped('shield', shield(1, false))).toBe(false);
    expect(isTargetEquipped('item', item(1, true))).toBe(true);
  });
});

describe('firstTarget', () => {
  it('is null when the character owns nothing enchantable', () => {
    expect(firstTarget(empty)).toBeNull();
  });

  it('falls through the kinds in order', () => {
    expect(firstTarget({ ...empty, items: [item(4)] })).toEqual({ type: 'item', id: 4 });
    expect(firstTarget({ ...empty, shields: [shield(3)], items: [item(4)] })).toEqual({
      type: 'shield',
      id: 3,
    });
    expect(firstTarget({ ...empty, armor: [armor(2)], shields: [shield(3)] })).toEqual({
      type: 'armor',
      id: 2,
    });
    expect(firstTarget({ ...empty, weapons: [weapon(1)], items: [item(4)] })).toEqual({
      type: 'weapon',
      id: 1,
    });
  });
});

describe('ENCHANT_TARGET_OPTIONS', () => {
  it('covers exactly the kinds the column allows', () => {
    expect([...ENCHANT_TARGET_ORDER].sort()).toEqual([...ENCHANT_TARGETS].sort());
  });

  it('offers every kind once, in display order, under a label of its own', () => {
    expect(ENCHANT_TARGET_OPTIONS.map((o) => o.key)).toEqual([...ENCHANT_TARGET_ORDER]);
    const labels = ENCHANT_TARGET_OPTIONS.map((o) => o.label);
    // What a chip shows is the FRENCH label, never the column key it carries —
    // the one mistake here that type-checks perfectly and ships « weapon ».
    expect(labels).toEqual(ENCHANT_TARGET_ORDER.map((k) => ENCHANT_TARGET_LABEL[k]));
    // And two kinds sharing a label would make the picker ambiguous.
    expect(new Set(labels).size).toBe(labels.length);
  });
});
