/**
 * Turning a thing on the sheet into something you can roll.
 *
 * PURE, and the ONLY place a {@link RollContext} is built. The point is
 * `confirm`: a 10 or a 1 is read against the character's own score in whatever
 * is being tested — **the compétence, the caractéristique, or the discipline
 * when casting** — never a total, never a sphère, never a tendance die. A rule
 * restated at five call sites is a rule that drifts at four of them.
 *
 * The other half is what goes into `parts`, which is not the same question. A
 * skill's TOT already carries its modifier (wound + effects are folded in by
 * `lib/skill-groups`), while a stat tile shows a raw value with its modifier
 * beside it — so a stat roll has to add that modifier itself, or the total would
 * silently ignore a wound.
 */
import {
  ATTRIBUTS,
  CARACTERISTIQUES,
  DISCIPLINE_LABEL,
  SPHERE_LABEL,
} from '@/constants/prophecy';
import { totalModifier, type ModifierSource } from '@/lib/modifiers';
import { DEFAULT_DIFFICULTY, type RollContext } from '@/lib/roll';
import type { SpellTotal } from '@/lib/spell-total';
import type { WeaponSkillReading } from '@/lib/weapon-skill';

/** What a modifier part is called when it makes the sum. */
const MODIFIER_LABEL = 'Modificateur';

/**
 * Both stat catalogues by column key, for the roller: the dialog titles a roll
 * with the full name a tile has no room for (« Volonté », not « VOL ») and keeps
 * the abbreviation for the sum. Attributs have no short form and use neither.
 *
 * Built once at module load — the catalogues are static — and shared, because
 * the Fiche and the GM's roster now build the same roll from two different
 * shapes of the same character.
 */
export const STAT_LABELS: Record<string, { label: string; abbr?: string }> = {
  ...Object.fromEntries(CARACTERISTIQUES.map((c) => [c.key, { label: c.label, abbr: c.abbr }])),
  ...Object.fromEntries(ATTRIBUTS.map((a) => [a.key, { label: a.label }])),
};

/** The one sphère whose fluctuation is the Fatalité rather than the Dragon. */
const OMBRE_SPHERE = 'sphereOmbre';

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
 * Casting a spell: the score from `lib/spell-total`, read against the spell's
 * own difficulté.
 *
 * **The discipline confirms.** A 10 or a 1 is read against the mage's score in
 * the kind of magic the spell belongs to — Invocatoire, Instinctive,
 * Sorcellerie — not against the casting total, and not against the sphère. That
 * is `total.discipline`, the same stat `spellTotal` already pulled off the sheet.
 *
 * Every term becomes its own part, matching `spellTotalBreakdown` so the verdict
 * line reads like the card: « 7 +4 (Feu) +3 (Sorcellerie) −2 +5 (clé) ». The two
 * stats always appear even at 0 (a sphère of 0 is information); the modifier and
 * the clé only when they apply.
 *
 * **The clé parfaite counts ONCE, here in the total.** It is the same +5 seen
 * from either side of the roll, and `SpellDetail` shows it as a lowered
 * difficulté — so the difficulté carried here is the spell's RAW number. Taking
 * both would apply it twice.
 *
 * `kind: 'cast'` is what turns the roll into magic: Miracle and Contrecoup
 * instead of critique and échec critique, no +5, and — on the tendance trio
 * only — consequences for the dice left on the table (see `lib/roll` readDice).
 * The **Sphère de l'Ombre moves the fluctuation to the Fatalité**; every other
 * sphere answers to the Dragon.
 */
export function spellRollContext(
  spell: { name: string; discipline: string; sphere: string; difficulty?: number | null },
  total: SpellTotal,
): RollContext {
  const name = spell.name.trim();
  const sphereLabel = SPHERE_LABEL[spell.sphere] ?? spell.sphere;
  const disciplineLabel = DISCIPLINE_LABEL[spell.discipline] ?? spell.discipline;
  const difficulty = spell.difficulty ?? 0;
  return {
    label: name === '' ? 'Incantation' : name,
    kind: 'cast',
    fluctuation: spell.sphere === OMBRE_SPHERE ? 'fatalite' : 'dragon',
    parts: [
      { label: sphereLabel, value: total.sphere },
      { label: disciplineLabel, value: total.discipline },
      ...(total.modifier !== 0 ? [{ label: MODIFIER_LABEL, value: total.modifier }] : []),
      ...(total.cle !== 0 ? [{ label: 'Clé parfaite', value: total.cle }] : []),
    ],
    confirm: total.discipline,
    confirmLabel: disciplineLabel,
    // A spell that never got its difficulté filled in would otherwise open the
    // roller at 0, which every roll clears — fall back to the usual default.
    difficulty: difficulty > 0 ? difficulty : DEFAULT_DIFFICULTY,
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
