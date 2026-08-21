/**
 * PNJ generator — an archetype plus randomness, turned into a character row.
 *
 * The whole rolling happens HERE, with no DB and no React: the repository only
 * writes what this returns, and the dialog only renders it. That split is what
 * makes « Relancer » cheap (re-run with a new seed, nothing persisted) and the
 * result testable (a seed replays a whole PNJ, stat for stat).
 *
 * Deliberately out of scope for this first version: gear, magic and tendances.
 * A generated PNJ is a stat block a GM can run in a fight tonight — not a
 * finished sheet. Anything the generator does not roll stays at the column
 * default, so a GM can fill it in by hand exactly as before.
 *
 * Pure — the only imports are the archetype catalogue's types, the creation
 * rules and the RNG, so it loads in plain-Node vitest like the other engines.
 */

import { DEFAULT_SKILLS } from '@/constants/prophecy';
import type { ArchetypePreset, ArchetypeStats } from '@/data/archetype-catalog';
import type { NewCharacter } from '@/db/schema';
import { initiativeDice, woundBoxes } from '@/lib/creation-rules';
import { nextTemplateIndex, templatedName, uniqueNpcName } from '@/lib/npc-names';
import { jitter, pick, randomSeed, seededRng, type Rng } from '@/lib/rng';

/**
 * How dangerous the PNJ is. `stat` shifts every caractéristique and attribut,
 * `skill` every compétence — one dial, so an élite is better at everything
 * rather than better at a list someone had to re-author.
 *
 * Initiative has no dial of its own because it is not authored: it derives from
 * COO + PER (lib/creation-rules), so a tier reaches it only through the two
 * caractéristiques it already moved. An élite gets a second action when its
 * COO + PER earns one, which is the only justification a player will accept.
 */
export const NPC_TIERS = [
  { key: 'figurant', label: 'Figurant', stat: -1, skill: -1 },
  { key: 'standard', label: 'Standard', stat: 0, skill: 0 },
  { key: 'elite', label: 'Élite', stat: 1, skill: 1 },
  { key: 'legende', label: 'Légende', stat: 2, skill: 2 },
] as const;

export type NpcTier = (typeof NPC_TIERS)[number]['key'];

/**
 * How far a roll may stray from the archetype. Compétences jitter less than
 * caractéristiques even at « chaotique »: a ±2 on a compétence of 2 erases it,
 * and an archetype that lists a compétence means the PNJ has it.
 */
export const NPC_VARIANCES = [
  { key: 'fixe', label: 'Fixe', stat: 0, skill: 0 },
  { key: 'leger', label: 'Léger', stat: 1, skill: 1 },
  { key: 'chaotique', label: 'Chaotique', stat: 2, skill: 1 },
] as const;

export type NpcVariance = (typeof NPC_VARIANCES)[number]['key'];

/** Bounds every rolled number lands in — a carac of 0 is not a weak PNJ, it is a bug. */
const STAT_MIN = 1;
const STAT_MAX = 10;
const SKILL_MIN = 1;

/** The caractéristiques and attributs a tier/variance actually rolls. */
const ROLLED_STATS = [
  'force', 'resistance', 'intelligence', 'volonte', 'coordination',
  'perception', 'presence', 'empathie', 'physique', 'mental', 'manuel', 'social',
] as const;

/**
 * Ceiling on one batch. Not a rule — a guard: the aperçu renders every PNJ, and
 * a GM who types 500 would freeze the screen before ever tapping « Ajouter ».
 */
export const MAX_BATCH = 20;

/** Typed batch size → the number to generate. Blank/junk reads as 0 (no batch). */
export function parseBatch(text: string): number {
  const n = parseInt(text, 10);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(MAX_BATCH, n);
}

/**
 * What a batch field keeps as the user types. A value past the ceiling is
 * rewritten to it rather than accepted and quietly ignored — a field reading 50
 * above an aperçu of 20 is the app lying about what it will write. Blank stays
 * blank: mid-typing is a legitimate state.
 */
export function clampBatchText(text: string): string {
  const trimmed = text.trim();
  if (trimmed === '') return '';
  const n = parseInt(trimmed, 10);
  if (!Number.isFinite(n)) return '';
  return n > MAX_BATCH ? String(MAX_BATCH) : trimmed;
}

export type GeneratedSkill = { name: string; attribut: string; value: number };

/** What one generated PNJ is, before anything touches the DB. */
export type GeneratedNpc = {
  /** The seed that produced it — pass it again to replay this exact PNJ. */
  seed: string;
  /** Which archetype it came from. Carried for the preview and the write log. */
  archetypeId: string;
  /** A patch on `characters`: identity, stats and the derived wound track. */
  character: Partial<NewCharacter>;
  skills: GeneratedSkill[];
  /** The resolved archetype choice, for the preview line (« Arme : Armes de choc »). */
  choice: { label: string; skill: string } | null;
};

/**
 * « No answer » to an archetype's option — what a picker sends for « Au hasard ».
 * Lives with the contract it belongs to (`optionChoice`) rather than in the
 * component that happens to render the chip.
 */
export const RANDOM_CHOICE = '';

export type GenerateNpcOptions = {
  tier?: NpcTier;
  variance?: NpcVariance;
  /**
   * The archetype option's answer. Anything not in the archetype's own list —
   * including undefined — is rolled, which is what « Au hasard » sends.
   */
  optionChoice?: string | null;
  /** Replay seed. Omitted means a fresh one, returned on the result. */
  seed?: string;
  /** Names already at the table, so the PNJ gets one of their own. */
  taken?: readonly string[];
  /**
   * A name to number instead of inventing one: « Garde » gives « Garde #1 »,
   * « Garde #2 »… Blank (the default) keeps the invented names — a crowd of
   * gardes wants a label, a named contact wants a name, and only the GM knows
   * which they are generating.
   */
  nameTemplate?: string | null;
};

const clamp = (n: number, min: number, max?: number) =>
  Math.min(max ?? Number.MAX_SAFE_INTEGER, Math.max(min, n));

/** The two dials, resolved once per PNJ and passed down as plain numbers. */
type Dials = { stat: number; skill: number; statSpread: number; skillSpread: number };

function dialsOf(tier: NpcTier, variance: NpcVariance): Dials {
  const t = NPC_TIERS.find((x) => x.key === tier) ?? NPC_TIERS[1];
  const v = NPC_VARIANCES.find((x) => x.key === variance) ?? NPC_VARIANCES[1];
  return { stat: t.stat, skill: t.skill, statSpread: v.stat, skillSpread: v.skill };
}

/** Roll one authored number: base, shifted by tier, nudged by variance. */
function roll(rng: Rng, base: number, delta: number, spread: number, min: number, max?: number) {
  return clamp(base + delta + jitter(rng, spread), min, max);
}

/**
 * The archetype's stat block, rolled. Caractéristiques and attributs share the
 * dial; the pools do not — they stay at their authored total (5 to 7 across
 * maîtrise and chance) shifted by tier alone, since jittering them makes a PNJ
 * that is randomly lucky for no reason a GM could explain.
 */
function rollStats(rng: Rng, stats: ArchetypeStats, d: Dials) {
  const out = {} as Record<(typeof ROLLED_STATS)[number], number>;
  for (const key of ROLLED_STATS) {
    out[key] = roll(rng, stats[key], d.stat, d.statSpread, STAT_MIN, STAT_MAX);
  }

  return {
    ...out,
    maitriseMax: clamp(stats.maitriseMax + d.stat, 0),
    chanceMax: clamp(stats.chanceMax + d.stat, 0),
    // Derived from the caractéristiques that were just rolled, not from the
    // archetype — the rulebook's own table (lib/creation-rules).
    initiativeMax: initiativeDice(out.coordination, out.perception),
  };
}

/**
 * The archetype's compétences, rolled, with the chosen option folded in.
 *
 * A chosen compétence the archetype already lists takes the HIGHER of the two
 * ratings rather than adding: « Corps à corps » picked on a protecteur who
 * already has it means they specialize in it, not that they are twice trained.
 */
function rollSkills(
  rng: Rng,
  archetype: ArchetypePreset,
  d: Dials,
  optionChoice: string | null | undefined,
): { skills: GeneratedSkill[]; choice: GeneratedNpc['choice'] } {
  const skills = archetype.data.skills.map((s) => ({
    name: s.name,
    attribut: s.attribut,
    value: roll(rng, s.value, d.skill, d.skillSpread, SKILL_MIN),
  }));

  const option = archetype.data.option;
  if (!option || option.choices.length === 0) return { skills, choice: null };

  const chosen =
    optionChoice && option.choices.includes(optionChoice)
      ? optionChoice
      : (pick(rng, option.choices) ?? option.choices[0]);
  const value = roll(rng, option.value, d.skill, d.skillSpread, SKILL_MIN);
  const existing = skills.find((s) => s.name === chosen);
  if (existing) {
    existing.value = Math.max(existing.value, value);
  } else {
    // Not on the archetype, so the attribut comes from the catalogue — which is
    // why `choices` holds DEFAULT_SKILLS names and nothing else.
    skills.push({ name: chosen, attribut: attributOf(chosen), value });
  }
  return { skills, choice: { label: option.label, skill: chosen } };
}

/**
 * Attribut of a compétence named by an option. Resolved from DEFAULT_SKILLS (the
 * build already proved the name is in it), so the option column stays a plain
 * list of names in the spreadsheet.
 */
const SKILL_ATTRIBUT = new Map(DEFAULT_SKILLS.map((s) => [s.name, s.attribut]));
const attributOf = (name: string) => SKILL_ATTRIBUT.get(name) ?? '';

/** One PNJ, fully rolled. */
export function generateNpc(
  archetype: ArchetypePreset,
  options: GenerateNpcOptions = {},
): GeneratedNpc {
  const {
    tier = 'standard',
    variance = 'leger',
    optionChoice,
    seed = randomSeed(),
    taken = [],
    nameTemplate,
  } = options;
  const template = nameTemplate?.trim() ?? '';
  const rng = seededRng(seed);
  const dials = dialsOf(tier, variance);

  const stats = rollStats(rng, archetype.data.stats, dials);
  const { skills, choice } = rollSkills(rng, archetype, dials, optionChoice);

  return {
    seed,
    archetypeId: archetype.id,
    character: {
      nom: template
        ? templatedName(template, nextTemplateIndex(template, taken))
        : uniqueNpcName(rng, taken),
      // `concept` is deliberately NOT filled from the archetype: it is the one
      // line where a GM writes what this PNJ is at their table (« le cousin du
      // maire », « celui qui a vu le dragon »), and a prefilled « Garde
      // assermenté » is a placeholder they would have to clear first. The
      // archetype's own concept stays a description for the picker.
      caste: archetype.caste,
      kind: 'npc',
      ...stats,
      // Same derivation as the initiative above — RÉS + VOL, by the book.
      ...woundBoxes(stats.resistance, stats.volonte),
    },
    skills,
    choice,
  };
}

/**
 * A whole batch — « générer 5 gardes ». Each PNJ is rolled from its own seed and
 * sees the names already handed out, so a batch reads as five different people
 * instead of five copies of one roll.
 */
export function generateNpcs(
  archetype: ArchetypePreset,
  count: number,
  options: GenerateNpcOptions = {},
): GeneratedNpc[] {
  const base = options.seed ?? randomSeed();
  const taken = [...(options.taken ?? [])];
  const out: GeneratedNpc[] = [];
  for (let i = 0; i < Math.max(0, Math.floor(count)); i++) {
    const npc = generateNpc(archetype, { ...options, seed: `${base}-${i}`, taken });
    taken.push(npc.character.nom ?? '');
    out.push(npc);
  }
  return out;
}
