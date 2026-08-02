// Casting score for one spell — the number a mage adds to their dice when they
// incant it. Prophecy builds it from two sheet stats plus the usual roll
// modifiers:
//
//   sphère (max, from the SHEET — not the spent `current` pool)
// + discipline (Invocatoire / Instinctive / Sorcellerie, a plain stat)
// + the modifiers that hit EVERY roll (wound malus + effects targeting 'all')
// + CLE_PARFAITE_BONUS when the mage crafted a clé parfaite for this spell
//
// The clé parfaite is deliberately counted here AND still rendered as a lowered
// difficulty in SpellDetail: the two readings are the same +5 seen from either
// side of the roll, so the term is always labelled where it appears.
//
// A sphere the character doesn't know is simply 0 — no special case, the total
// degrades to discipline + modifiers.

import { CLE_PARFAITE_BONUS, DISCIPLINE_LABEL, SPHERE_LABEL } from '@/constants/prophecy';
import { globalModifier, type ModifierSource } from '@/lib/modifiers';

/** The only spell fields the score reads — a `Spell` row or a catalogue preset. */
export interface SpellTotalInput {
  discipline: string;
  sphere: string;
  cleParfaite?: boolean | null;
}

/** Every term of the score, kept apart so the UI can show the arithmetic. */
export interface SpellTotal {
  /** `${sphere}Max` on the character (0 = sphere unknown). */
  sphere: number;
  /** The discipline stat, whose key IS the character column. */
  discipline: number;
  /** Wound malus + effects targeting 'all' (signed, often 0). */
  modifier: number;
  /** CLE_PARFAITE_BONUS, or 0 when no key is crafted. */
  cle: number;
  total: number;
}

/** Character column holding a sphere's max, from its `constants/prophecy` key. */
export function sphereMaxKey(sphereKey: string): string {
  return `${sphereKey}Max`;
}

/**
 * Casting score for `spell`. `rec` is the CHARACTER row through `asNumRecord`
 * (spheres and disciplines both live on the sheet); `effects`/`wound` are the
 * same pair every other roll uses — pass an empty list and 0 for a raw score.
 */
export function spellTotal(
  spell: SpellTotalInput,
  rec: Record<string, number>,
  effects: readonly ModifierSource[] = [],
  wound = 0,
): SpellTotal {
  const sphere = rec[sphereMaxKey(spell.sphere)] ?? 0;
  const discipline = rec[spell.discipline] ?? 0;
  const g = globalModifier(effects, wound);
  const modifier = g.wound + g.effects;
  const cle = spell.cleParfaite ? CLE_PARFAITE_BONUS : 0;
  return { sphere, discipline, modifier, cle, total: sphere + discipline + modifier + cle };
}

/**
 * The score spelled out, e.g. `Feu 4 + Sorcellerie 3 − 2 + clé 5`. Shown under
 * the total so a player can check where the number comes from; zero terms are
 * dropped, except the two stats which always appear (a 0 sphere is information).
 */
export function spellTotalBreakdown(t: SpellTotal, spell: SpellTotalInput): string {
  const sphere = SPHERE_LABEL[spell.sphere] ?? spell.sphere;
  const discipline = DISCIPLINE_LABEL[spell.discipline] ?? spell.discipline;
  let out = `${sphere} ${t.sphere} + ${discipline} ${t.discipline}`;
  if (t.modifier !== 0) out += ` ${t.modifier > 0 ? '+' : '−'} ${Math.abs(t.modifier)}`;
  if (t.cle !== 0) out += ` + clé ${t.cle}`;
  return out;
}
