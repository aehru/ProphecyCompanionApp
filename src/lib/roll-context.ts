/**
 * Turning a thing on the sheet into something you can roll.
 *
 * PURE, and the ONLY place a {@link RollContext} is built. The point is
 * `confirm`: the rule says a 10 or a 1 is read against **the compétence or the
 * caractéristique** — never a total, never a tendance die — and a rule restated
 * at four call sites is a rule that drifts at three of them.
 *
 * The other half is what goes into `parts`, which is not the same question. A
 * skill's TOT already carries its modifier (wound + effects are folded in by
 * `lib/skill-groups`), while a stat tile shows a raw value with its modifier
 * beside it — so a stat roll has to add that modifier itself, or the total would
 * silently ignore a wound.
 */
import { totalModifier, type ModifierSource } from '@/lib/modifiers';
import type { RollContext } from '@/lib/roll';
import type { WeaponSkillReading } from '@/lib/weapon-skill';

/** What a modifier part is called when it makes the sum. */
const MODIFIER_LABEL = 'Modificateur';

/**
 * A compétence: the TOT is what the die adds to, the points bought are what a
 * 10 is confirmed against. Those are deliberately two different numbers — a TOT
 * of 12 could never be undercut by a D10, so confirming there would make every
 * 10 a critique.
 */
export function skillRollContext(skill: {
  name: string;
  /** COMP + attribut + modifier, as the row's badge shows it. */
  total: number;
  /** The points bought — the row's COMP column. */
  value: number;
}): RollContext {
  return {
    label: skill.name,
    parts: [{ label: skill.name, value: skill.total }],
    confirm: skill.value,
    confirmLabel: 'Compétence',
  };
}

/**
 * An attack with a weapon — which is a compétence roll, so it goes through
 * {@link skillRollContext} rather than repeating its rule.
 *
 * Returns null unless the weapon's compétence actually resolved: a weapon with
 * no skill linked, or one naming a compétence that no longer exists, has no
 * total to roll and the card says so instead (see `lib/weapon-skill`).
 *
 * The weapon NAMES the roll while the compétence carries the number — « Épée
 * longue » is what the player is doing, « Corps à corps 14 » is what it is worth.
 *
 * A weapon whose compétence is untrained resolves with `value: 0`, so its
 * `confirm` is 0: no reroll can land strictly under it, and any reroll lands
 * strictly over. An untrained attack therefore cannot crit and always confirms
 * its fumble — which is what "non acquise" should feel like.
 */
export function weaponRollContext(
  weaponName: string,
  skill: WeaponSkillReading,
): RollContext | null {
  if (skill.status !== 'ok') return null;
  const name = weaponName.trim();
  return {
    ...skillRollContext({ name: skill.name, total: skill.total, value: skill.value }),
    label: name === '' ? skill.name : name,
  };
}

/**
 * A caractéristique or an attribut, straight off its tile.
 *
 * The modifier is computed here through `totalModifier` — wound malus + the
 * effects on that stat + the ones on `'all'` — which is NOT what the tile's
 * badge shows: the badge carries only the effects aimed at the stat, because
 * the wound malus is displayed once per character by <GlobalModifierRow> (a
 * roll usually spans two stats). A roll is one stat, so here it counts.
 *
 * An attribut confirms on ITSELF. The rule names the compétence or the
 * caractéristique, and a bare attribut roll has neither — the value being
 * tested is the only number left to answer to.
 */
export function statRollContext(stat: {
  /** The column key, e.g. `volonte` — how effects target it. */
  key: string;
  /** Spelled out for the dialog's title: « Volonté ». */
  label: string;
  /** Short form for the sum, e.g. « VOL ». Falls back to `label`. */
  abbr?: string;
  value: number;
  kind: 'caracteristique' | 'attribut';
  effects: readonly ModifierSource[];
  wound: number;
}): RollContext {
  const modifier = totalModifier(stat.key, stat.effects, stat.wound);
  return {
    label: stat.label,
    parts: [
      { label: stat.abbr ?? stat.label, value: stat.value },
      // Dropped at 0 rather than printed: « 6 +4 (VOL) +0 (Modificateur) » reads
      // as though something applied when nothing did.
      ...(modifier !== 0 ? [{ label: MODIFIER_LABEL, value: modifier }] : []),
    ],
    confirm: stat.value,
    confirmLabel: stat.kind === 'attribut' ? 'Attribut' : 'Caractéristique',
  };
}
