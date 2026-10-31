// Bonuses carried by a weapon or a shield: permanent ones are columns on the row,
// temporary ones are `effects` rows targeting it as `<kind>:<id>:<stat>`, so they
// reuse the durations and the "temps écoulé" tick. A gear target matches no stat
// key, so these rows never leak into another roll's modifier.

import type { ModifierSource } from '@/lib/modifiers';
import type { WeaponSkillReading } from '@/lib/weapon-skill';

export type GearKind = 'weapon' | 'shield';
export type GearStat = 'hit' | 'damage' | 'init';

const STAT_LABEL: Record<GearStat, string> = {
  hit: 'Toucher',
  damage: 'Dégâts',
  init: 'Initiative',
};

const GEAR_TARGET = /^(weapon|shield):(\d+):(hit|damage|init)$/;

export function gearTarget(kind: GearKind, id: number, stat: GearStat): string {
  return `${kind}:${id}:${stat}`;
}

export function isGearTarget(target: string): boolean {
  return GEAR_TARGET.test(target);
}

/**
 * Rewrite a gear target's number: id → position on export, position → id on
 * import (see `enchantSchema` for why links travel as positions). Any other
 * target passes through; a gear target that no longer resolves returns null, so
 * the effect is dropped rather than bound to the wrong sword.
 */
export function remapGearTarget(
  target: string,
  resolve: (kind: GearKind, n: number) => number | undefined,
): string | null {
  const m = GEAR_TARGET.exec(target);
  if (!m) return target;
  const n = resolve(m[1] as GearKind, Number(m[2]));
  return n == null ? null : `${m[1]}:${n}:${m[3]}`;
}

function temporary(target: string, effects: readonly ModifierSource[]): number {
  let total = 0;
  for (const e of effects) {
    if (!e.expired && e.target === target) total += e.value ?? 0;
  }
  return total;
}

/** A damage formula with a flat bonus after everything else; empty stays empty. */
export function withDamageBonus(raw: string, bonus: number): string {
  if (bonus === 0 || raw.trim() === '') return raw;
  return `${raw.trim()} ${bonus > 0 ? '+' : '-'}${Math.abs(bonus)}`;
}

/**
 * The weapon as it plays right now: bonuses folded into damage and initiative,
 * `hitBonus` the permanent + temporary total. For DISPLAY and rolls only — the
 * editor reads the raw row, and this must never be written back.
 */
export function applyWeaponBonus<
  T extends {
    id: number;
    damage: string;
    initMelee: number;
    initCorpsACorps: number;
    hitBonus: number;
    damageBonus: number;
    initBonus: number;
  },
>(w: T, effects: readonly ModifierSource[]): T {
  const of = (stat: GearStat) => temporary(gearTarget('weapon', w.id, stat), effects);
  const init = w.initBonus + of('init');
  return {
    ...w,
    damage: withDamageBonus(w.damage, w.damageBonus + of('damage')),
    initMelee: w.initMelee + init,
    initCorpsACorps: w.initCorpsACorps + init,
    hitBonus: w.hitBonus + of('hit'),
  };
}

/** {@link applyWeaponBonus} for a shield, which has no initiative. */
export function applyShieldBonus<
  T extends { id: number; damage: string; hitBonus: number; damageBonus: number },
>(s: T, effects: readonly ModifierSource[]): T {
  const of = (stat: GearStat) => temporary(gearTarget('shield', s.id, stat), effects);
  return {
    ...s,
    damage: withDamageBonus(s.damage, s.damageBonus + of('damage')),
    hitBonus: s.hitBonus + of('hit'),
  };
}

/** A compétence reading with the weapon's hit bonus on top of its total. */
export function withHitBonus(reading: WeaponSkillReading, bonus: number): WeaponSkillReading {
  if (reading.status !== 'ok' || bonus === 0) return reading;
  return { ...reading, bonus: reading.bonus + bonus, total: reading.total + bonus };
}

/** Effect-dialog options: one per bonus each piece of gear can take. */
export function gearTargetOptions(
  weapons: readonly { id: number; name: string }[],
  shields: readonly { id: number; name: string }[],
): { key: string; label: string }[] {
  const options = (
    kind: GearKind,
    rows: readonly { id: number; name: string }[],
    stats: GearStat[],
    fallback: string,
  ) =>
    rows.flatMap((r) =>
      stats.map((stat) => ({
        key: gearTarget(kind, r.id, stat),
        label: `${r.name.trim() || fallback} · ${STAT_LABEL[stat]}`,
      })),
    );
  return [
    ...options('weapon', weapons, ['hit', 'damage', 'init'], 'Arme'),
    ...options('shield', shields, ['hit', 'damage'], 'Bouclier'),
  ];
}
