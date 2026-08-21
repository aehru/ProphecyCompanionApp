import type { NewCharacter } from '@/db/schema';
import type { CasteKey } from '@/constants/prophecy';

import { ARCHETYPE_CATALOG_DATA } from './archetype-catalog.gen';

/**
 * The stat block an archetype carries, at the « standard » tier. Keys are the
 * `characters` columns so a generated NPC is a plain patch on the table — the
 * generator only jitters the numbers, it never renames anything.
 *
 * Wound boxes and initiative dice are absent ON PURPOSE: they derive from
 * RÉS + VOL and COO + PER through `lib/creation-rules`, so authoring them here
 * would let a spreadsheet disagree with the rulebook. Magic is absent too — a
 * generated NPC has none for now (see the module doc below).
 */
export type ArchetypeStats = Required<
  Pick<
    NewCharacter,
    | 'force'
    | 'resistance'
    | 'intelligence'
    | 'volonte'
    | 'coordination'
    | 'perception'
    | 'presence'
    | 'empathie'
    | 'physique'
    | 'mental'
    | 'manuel'
    | 'social'
    | 'maitriseMax'
    | 'chanceMax'
  >
>;

/**
 * One authored choice offered before generating — « quelle arme ? », « quel
 * domaine ? ». The chosen compétence is granted at `value`, on top of the
 * archetype's own list.
 *
 * It exists so one archetype per caste stays enough: a combattant is a combattant
 * whether they carry an axe or a bow, and forking the CSV per weapon would
 * multiply eight rows into forty. A caller that skips the choice gets a random
 * one — the dialog offers « Au hasard » for exactly that.
 *
 * Only compétence choices for now. A sphere choice (« quel mage ? ») is the next
 * kind and will add a column rather than overload this one.
 */
export type ArchetypeOption = {
  /** Slug of `label`, stable across re-renders — used as a list key. */
  key: string;
  label: string;
  /** Rating given to the chosen compétence. */
  value: number;
  /** DEFAULT_SKILLS names, in author order. */
  choices: string[];
};

/** A compétence an archetype always has, with its attribut already resolved. */
export type ArchetypeSkill = { name: string; attribut: string; value: number };

/**
 * A generatable NPC template — one per caste for now.
 *
 * AUTHORED AS A SPREADSHEET: edit `data-src/archetypes.csv` (Excel, séparateur
 * « ; ») then run `bun run build:catalogs`, which validates every row (unknown
 * compétence, unknown caste, non-integer stat) and regenerates
 * `archetype-catalog.gen.ts`. Never edit the .gen file.
 *
 * The numbers are the « standard » tier; `lib/npc-generator` shifts them by tier
 * and jitters them by variance. Gear, spells and tendances are deliberately out
 * of scope for this first version — a generated NPC is a stat block a GM can
 * run, not a finished character sheet.
 */
export type ArchetypePreset = {
  /** Stable slug (used as list key). */
  id: string;
  /** NULL is « Sans Caste » — a real choice, like everywhere else (see CASTES). */
  caste: CasteKey | null;
  data: {
    name: string;
    concept: string;
    stats: ArchetypeStats;
    skills: ArchetypeSkill[];
    option: ArchetypeOption | null;
  };
};

export { ARCHETYPE_CATALOG_DATA as ARCHETYPE_CATALOG } from './archetype-catalog.gen';

const BY_ID = new Map(ARCHETYPE_CATALOG_DATA.map((a) => [a.id, a]));

/**
 * One archetype by id, falling back to the first — a picker's value can only go
 * stale by an id leaving the CSV, and a screen with no archetype at all has
 * nothing to show. Shared so the screen and its controls resolve it the same way.
 */
export function archetypeById(id: string): ArchetypePreset | undefined {
  return BY_ID.get(id) ?? ARCHETYPE_CATALOG_DATA[0];
}
