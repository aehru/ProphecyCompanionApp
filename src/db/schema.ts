import { sql } from 'drizzle-orm';
import { check, integer, real, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

import { CASTES, type CasteKey, DISCIPLINES, SPHERES, TIME_UNITS } from '@/constants/prophecy';
import type { ArmorCategory } from '@/data/armor-constants';
import { newUuid } from '@/lib/uuid';

// The caste list lives in `constants/prophecy` (it carries the accented labels);
// drizzle's text enum wants a non-empty tuple, which `.map` can't prove.
const CASTE_KEYS = CASTES.map((c) => c.key) as unknown as readonly [CasteKey, ...CasteKey[]];

type DisciplineKey = (typeof DISCIPLINES)[number]['key'];
type SphereKey = (typeof SPHERES)[number]['key'];
type TimeUnit = (typeof TIME_UNITS)[number]['key'];

/**
 * A Prophecy (2e) character sheet.
 *
 * Naming convention: generic columns are English; Prophecy-specific game terms
 * stay French, stored without accents (safe as keys) and displayed with accents.
 */
export const characters = sqliteTable('characters', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  createdAt: integer('created_at', { mode: 'timestamp_ms' })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
    .notNull()
    .$defaultFn(() => new Date()),

  // Portable, stable id that survives export/import and device changes — used to
  // re-link a character to its campaign roster slot (see docs/campaign-protocol).
  // NULLABLE at the DB level on purpose: SQLite can't ADD a NOT NULL column
  // without a constant default, and a UUID can't have one. New rows get a value
  // via $defaultFn; existing rows are filled by a startup backfill
  // (repositories/characters.backfillCharacterUuids). Uniqueness is a separate
  // index below (SQLite treats each NULL as distinct, so pre-backfill rows are OK).
  uuid: text('uuid').$defaultFn(() => newUuid()),

  // Identity
  nom: text('nom').notNull().default(''),
  concept: text('concept').notNull().default(''),

  // Social order the character belongs to, stored accent-free (see CASTES).
  // NULLABLE and NULL by default on purpose: « Sans Caste » is a legitimate
  // choice, and an existing row that predates the column is in exactly that
  // state — so no backfill is needed and no sentinel string is invented.
  // A label only: nothing computes from it (see the CASTES doc comment).
  caste: text('caste', { enum: CASTE_KEYS }),

  // What this character IS to its owner: a player character, or an NPC the GM
  // runs at the table. Purely a label — an NPC is a full character row with the
  // same columns, so a PC can be promoted to NPC and back. Drives the badge in
  // the character list and the "Nouveau PNJ" flow (UI says PNJ, code says NPC).
  kind: text('kind', { enum: ['pc', 'npc'] })
    .notNull()
    .default('pc'),

  // Tendances — each has a main number + a subnumber (0–10)
  dragon: integer('dragon').notNull().default(0),
  dragonSub: integer('dragon_sub').notNull().default(0),
  fatalite: integer('fatalite').notNull().default(0),
  fataliteSub: integer('fatalite_sub').notNull().default(0),
  homme: integer('homme').notNull().default(0),
  hommeSub: integer('homme_sub').notNull().default(0),

  // Characteristics (full name stored; UI shows abbreviation)
  force: integer('force').notNull().default(0),
  resistance: integer('resistance').notNull().default(0),
  intelligence: integer('intelligence').notNull().default(0),
  volonte: integer('volonte').notNull().default(0),
  coordination: integer('coordination').notNull().default(0),
  perception: integer('perception').notNull().default(0),
  presence: integer('presence').notNull().default(0),
  empathie: integer('empathie').notNull().default(0),

  // Attributs
  physique: integer('physique').notNull().default(0),
  mental: integer('mental').notNull().default(0),
  manuel: integer('manuel').notNull().default(0),
  social: integer('social').notNull().default(0),

  // Health — max boxes per wound level, set at creation
  egratignureMax: integer('egratignure_max').notNull().default(0),
  legereMax: integer('legere_max').notNull().default(0),
  graveMax: integer('grave_max').notNull().default(0),
  fataleMax: integer('fatale_max').notNull().default(0),
  mortMax: integer('mort_max').notNull().default(0),

  // Resource pools — max set at creation, current value changes in play
  maitriseMax: integer('maitrise_max').notNull().default(0),
  chanceMax: integer('chance_max').notNull().default(0),
  // Number of initiative actions/dice per turn
  initiativeMax: integer('initiative_max').notNull().default(0),

  // Magic — global reserve max (prefilled = Volonté at creation, then editable
  // in the Magie tab; current value lives on actual_state).
  reserveMagiqueMax: integer('reserve_magique_max').notNull().default(0),
  // Per-sphere max (0 = sphere not known). Current values live on actual_state.
  sphereCitesMax: integer('sphere_cites_max').notNull().default(0),
  sphereFeuMax: integer('sphere_feu_max').notNull().default(0),
  sphereMetalMax: integer('sphere_metal_max').notNull().default(0),
  sphereNatureMax: integer('sphere_nature_max').notNull().default(0),
  sphereOceansMax: integer('sphere_oceans_max').notNull().default(0),
  spherePierreMax: integer('sphere_pierre_max').notNull().default(0),
  sphereRevesMax: integer('sphere_reves_max').notNull().default(0),
  sphereVentsMax: integer('sphere_vents_max').notNull().default(0),
  sphereOmbreMax: integer('sphere_ombre_max').notNull().default(0),
  // Disciplines — plain stats like the caractéristiques.
  magieInvocatoire: integer('magie_invocatoire').notNull().default(0),
  magieInstinctive: integer('magie_instinctive').notNull().default(0),
  sorcellerie: integer('sorcellerie').notNull().default(0),

  biographie: text('biographie').notNull().default(''),

  // Media — relative paths under <Paths.document>/media/characters/<id>/.
  // Relative (not absolute) so they survive the document dir changing across
  // reinstalls; resolved to a file:// uri at read (see lib/media). Null = unset.
  avatarPath: text('avatar_path'),
  portraitPath: text('portrait_path'),
}, (table) => [
  // Tendance puces are always 0–10, enforced at the DB level.
  // Use raw unqualified column names — SQLite rejects table-qualified names in a CHECK.
  check('dragon_sub_range', sql`dragon_sub >= 0 AND dragon_sub <= 10`),
  check('fatalite_sub_range', sql`fatalite_sub >= 0 AND fatalite_sub <= 10`),
  check('homme_sub_range', sql`homme_sub >= 0 AND homme_sub <= 10`),
  // Portable character id is unique when set (NULLs allowed pre-backfill).
  uniqueIndex('characters_uuid_unique').on(table.uuid),
]);

/**
 * The character's live state across the whole game (1 row per character):
 * current wound boxes per level, resource pools, conditions, notes.
 */
export const actualState = sqliteTable('actual_state', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  characterId: integer('character_id')
    .notNull()
    .references(() => characters.id, { onDelete: 'cascade' }),

  // Health — current filled boxes per wound level
  egratignureCurrent: integer('egratignure_current').notNull().default(0),
  legereCurrent: integer('legere_current').notNull().default(0),
  graveCurrent: integer('grave_current').notNull().default(0),
  fataleCurrent: integer('fatale_current').notNull().default(0),
  mortCurrent: integer('mort_current').notNull().default(0),

  // Resource pools — current in-play value (max lives on the character)
  maitriseCurrent: integer('maitrise_current').notNull().default(0),
  chanceCurrent: integer('chance_current').notNull().default(0),

  // Magic — current reserve + per-sphere current (maxes live on the character)
  reserveMagiqueCurrent: integer('reserve_magique_current').notNull().default(0),
  sphereCitesCurrent: integer('sphere_cites_current').notNull().default(0),
  sphereFeuCurrent: integer('sphere_feu_current').notNull().default(0),
  sphereMetalCurrent: integer('sphere_metal_current').notNull().default(0),
  sphereNatureCurrent: integer('sphere_nature_current').notNull().default(0),
  sphereOceansCurrent: integer('sphere_oceans_current').notNull().default(0),
  spherePierreCurrent: integer('sphere_pierre_current').notNull().default(0),
  sphereRevesCurrent: integer('sphere_reves_current').notNull().default(0),
  sphereVentsCurrent: integer('sphere_vents_current').notNull().default(0),
  sphereOmbreCurrent: integer('sphere_ombre_current').notNull().default(0),

  // Money — count of each Drac coin. Kept separate (no universal conversion).
  dracFer: integer('drac_fer').notNull().default(0),
  dracBronze: integer('drac_bronze').notNull().default(0),
  dracArgent: integer('drac_argent').notNull().default(0),
  dracOr: integer('drac_or').notNull().default(0),

  // Current-turn initiative values (X = the character's effective dice count)
  initiativeValues: text('initiative_values', { mode: 'json' })
    .$type<number[]>()
    .notNull()
    .default(sql`'[]'`),
  // Temporary initiative dice, in play. SIGNED: two-weapon fighting and some
  // spells grant extra actions, other situations take one away. Deliberately a
  // plain count the player manages by hand rather than a rules engine — the
  // rulebook has too many sources to enumerate, and any malus that comes with
  // the extra die is entered as a normal `effects` row. Never auto-cleared.
  initiativeBonusDice: integer('initiative_bonus_dice').notNull().default(0),
  // What each die is FOR — one DS icon key per slot, index-aligned with
  // `initiativeValues` ('' = unmarked). A player fighting with two weapons marks
  // which die is the off hand; the app attaches no rule to the mark, it is a
  // memo. A SEPARATE array rather than making `initiativeValues` an array of
  // objects: that column shipped as `number[]`, crosses the wire, and reshaping
  // it would force a tolerant reader on every consumer forever. Device-local —
  // it is not projected to a GM (see ROADMAP, revisited for the co-GM).
  initiativeDiceIcons: text('initiative_dice_icons', { mode: 'json' })
    .$type<string[]>()
    .notNull()
    .default(sql`'[]'`),

  conditions: text('conditions').notNull().default(''),
  notes: text('notes').notNull().default(''),

  updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
    .notNull()
    .$defaultFn(() => new Date()),
});

/**
 * A character's skills (compétences). One row per owned skill.
 * `name` matches a DEFAULT_SKILLS entry for catalogue skills, or is free text
 * for player-added ("free") skills. `attribut` is the linked attribut key
 * (physique/mental/manuel/social). Skills at value 0 are not persisted.
 */
export const skills = sqliteTable('skills', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  characterId: integer('character_id')
    .notNull()
    .references(() => characters.id, { onDelete: 'cascade' }),
  name: text('name').notNull().default(''),
  attribut: text('attribut').notNull().default(''),
  value: integer('value').notNull().default(0),
  // Specialization link (name-keyed). A base skill has both null. A
  // specialization ("Herboristerie (Curative)") derives from a mother skill:
  // `parentName` is the mother's `name`, `specLabel` the short label ("Curative"),
  // and `name` stays the canonical composite so effect targeting (`skill:<name>`)
  // stays unique. It's seeded from the mother's value at creation, then evolves
  // on its own and shares the mother's `attribut`. Cascade (mother gone → specs
  // dropped) is enforced in the repository, not by a FK.
  parentName: text('parent_name'),
  specLabel: text('spec_label'),
});

/**
 * A character's armor catalogue. One row per owned armor (a character can hold
 * several and swap between them across a campaign). `equipped` marks the single
 * active armor — enforced one-at-a-time in the repository. `defenseMax` is the
 * armor's full protection; `defenseCurrent` drops as it absorbs hits in a fight
 * (floored at 0 = broken, but kept until the player deletes it). `category`,
 * `prerequisites`, `creationDifficulty`/`creationTime` and `special` mirror the
 * matching `weapons` columns. `encombrementMalus` (pénalité d'encombrement) is
 * display-only for now — not folded into `lib/modifiers` roll computation yet.
 */
export const armor = sqliteTable('armor', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  characterId: integer('character_id')
    .notNull()
    .references(() => characters.id, { onDelete: 'cascade' }),
  name: text('name').notNull().default(''),
  category: text('category').$type<ArmorCategory>().notNull().default('Armures légères'),
  defenseMax: integer('defense_max').notNull().default(0),
  defenseCurrent: integer('defense_current').notNull().default(0),
  equipped: integer('equipped', { mode: 'boolean' }).notNull().default(false),
  prerequisites: text('prerequisites').notNull().default(''),
  creationDifficulty: integer('creation_difficulty').notNull().default(0),
  creationTime: real('creation_time').notNull().default(0),
  special: text('special').notNull().default(''),
  encombrementMalus: integer('encombrement_malus').notNull().default(0),
});

/**
 * A character's generic inventory: loot that isn't a weapon/armor/spell (a
 * rune, a potion, a trinket, coils of rope...). Free text, no catalogue link —
 * `name` + `description` are whatever the player types. `quantity` stacks
 * identical pickups on one row instead of one row per item. `equipped` is
 * multi-slot (unlike `armor.equipped`, which is exclusive): several items can
 * be worn/held at once, so toggling one never touches the others.
 */
export const items = sqliteTable('items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  characterId: integer('character_id')
    .notNull()
    .references(() => characters.id, { onDelete: 'cascade' }),
  name: text('name').notNull().default(''),
  description: text('description').notNull().default(''),
  quantity: integer('quantity').notNull().default(1),
  equipped: integer('equipped', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at', { mode: 'timestamp_ms' })
    .notNull()
    .$defaultFn(() => new Date()),
});

/**
 * Which hand a weapon is currently equipped in. `null` = not equipped; `'main'`
 * / `'off'` for a one-handed weapon (dual-wield = one in each); `'both'` for a
 * two-handed weapon occupying both hands.
 */
export const EQUIPPED_HANDS = ['main', 'off', 'both'] as const;
export type EquippedHand = (typeof EQUIPPED_HANDS)[number];

/**
 * A character's weapon catalogue. One row per owned weapon. `damage`,
 * `prerequisites`, `rangeEffective` and `rangeMax` hold raw formula strings
 * (e.g. `FOR x2 +3 +1D10`) parsed/computed at display by `lib/formula`; range
 * columns are nullable (null = melee weapon, no range). The two initiative
 * columns are plain signed ints (display-only for now). `hands` is the weapon's
 * handedness; `equippedHand` tracks which hand it's wielded in (see enum above).
 * Enchantments are deferred — they'll get their own `weapon_enchants` table
 * (FK weaponId, cascade), not a json column here.
 */
export const weapons = sqliteTable('weapons', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  characterId: integer('character_id')
    .notNull()
    .references(() => characters.id, { onDelete: 'cascade' }),
  name: text('name').notNull().default(''),
  damage: text('damage').notNull().default(''),
  prerequisites: text('prerequisites').notNull().default(''),
  creationDifficulty: integer('creation_difficulty').notNull().default(0),
  // REAL, not integer: a few rulebook weapons take half a day to craft (0.5).
  creationTime: real('creation_time').notNull().default(0),
  initMelee: integer('init_melee').notNull().default(0),
  initCorpsACorps: integer('init_corps_a_corps').notNull().default(0),
  special: text('special').notNull().default(''),
  rangeEffective: text('range_effective'),
  rangeMax: text('range_max'),
  // Handedness as a count: 1 = one-handed, 2 = two-handed.
  hands: integer('hands').$type<1 | 2>().notNull().default(1),
  equippedHand: text('equipped_hand', { enum: EQUIPPED_HANDS }),
  // The compétence this weapon is wielded with — a `skills.name` (or a
  // DEFAULT_SKILLS name the character hasn't bought yet), which is what makes
  // the attack total readable: attribut + points + modificateurs. NULLABLE on
  // purpose, and the only column here that is: a catalogue weapon arrives with
  // it filled (resolved from the preset's category at build time), but a
  // hand-made weapon and every row predating this column legitimately have no
  // skill until the player picks one — « Compétence non définie » is a real
  // state, not an empty string. Name-keyed like `skills.parentName` and the
  // `skill:<name>` effect targets; may hold a spécialisation's composite name
  // ("Armes tranchantes (Épée longue)") when the player overrides it.
  skillName: text('skill_name'),
});

/**
 * A character's known spells. One row per learned spell (mirrors `weapons` —
 * plain list, always "known", no prepared/active state). `discipline` and
 * `sphere` store the corresponding `constants/prophecy` key; `castTimeUnit`
 * reuses the effect time units. `level` (niveau), `complexity`, `cost`,
 * `difficulty` and cast time are display-only for now (no casting/pool
 * interaction yet). `cle` (clé) and `effect` are free text; `cleParfaite` marks
 * a crafted perfect key (+5 to cast).
 *
 * `effect` is the rulebook paragraph, verbatim and untouched — it stays the
 * source of truth. The fields around it (`inGameEffect`, `sensoryEffect`,
 * `duration`, `targets`, `tags`) are a CONVENIENCE LAYER extracted from it
 * so the app can show the mechanics apart from the prose, resolve a durée once
 * NR is known, and filter 300+ spells by what they do. Every one of them is
 * optional and empty by default: a spell with none renders exactly as it did
 * before they existed, which is what keeps a partially-filled catalogue
 * shippable.
 */
export const spells = sqliteTable('spells', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  characterId: integer('character_id')
    .notNull()
    .references(() => characters.id, { onDelete: 'cascade' }),
  name: text('name').notNull().default(''),
  /** Niveau du sortilège (1 = le plus bas). */
  level: integer('level').notNull().default(1),
  complexity: integer('complexity').notNull().default(0),
  discipline: text('discipline').$type<DisciplineKey>().notNull().default('sorcellerie'),
  sphere: text('sphere').$type<SphereKey>().notNull().default('sphereFeu'),
  /**
   * Draconic restriction: this sortilège is open only to a mage sworn to the
   * dragon who patrons its sphère (« Mage de Kroryn » for a Sphère du Feu
   * spell), rather than to everyone who knows the sphère.
   *
   * A BOOLEAN and not the dragon's name: the nine dragons pair one-to-one with
   * the nine sphères (`GREAT_DRAGONS`), so the name is already implied by
   * `sphere` — storing it too could only repeat it or contradict it. Which
   * dragon it reads as comes from `dragonMageLabel(sphere)`.
   *
   * Informative: the app shows it and never blocks a pick on it. Whether a
   * character is sworn to that dragon is not something the sheet records, and
   * the GM rules on it either way. Catalogue-authored only — no editor writes
   * it, which is why the sync treats `false` as "nothing recorded yet".
   */
  dragonOnly: integer('dragon_only', { mode: 'boolean' }).notNull().default(false),
  cost: integer('cost').notNull().default(0),
  castTimeAmount: integer('cast_time_amount').notNull().default(1),
  castTimeUnit: text('cast_time_unit').$type<TimeUnit>().notNull().default('action'),
  difficulty: integer('difficulty').notNull().default(0),
  cle: text('cle').notNull().default(''),
  /**
   * The mage crafted a "clé parfaite" for this spell: casting it gets
   * `CLE_PARFAITE_BONUS` (+5), rendered as a difficulty lowered by that much.
   * Toggled in play (crafted / used up), so it flips from the spell editor.
   */
  cleParfaite: integer('cle_parfaite', { mode: 'boolean' }).notNull().default(false),
  effect: text('effect').notNull().default(''),

  // --- convenience layer, all derived from `effect` (see the doc comment) ----

  /** The mechanical half of `effect`: numbers, durations, restrictions. */
  inGameEffect: text('in_game_effect').notNull().default(''),
  /**
   * What the character and the witnesses actually perceive — named for the
   * senses, not for the Perception caractéristique, which it has nothing to do
   * with. Extracted ONLY where `effect` already describes it: most spells say
   * nothing sensory, and this app does not invent rulebook text, so empty is
   * the common case (69 of the 136 base-rulebook spells have one).
   */
  sensoryEffect: text('sensory_effect').notNull().default(''),
  /**
   * How long the spell lasts, as an NR formula (`1 + NR`, `30 + 30 x NR`) —
   * `lib/formula` with `{ nr: true }`. Symbolic until the player enters the NR
   * they rolled. Empty = instantaneous, permanent, or not stated.
   */
  duration: text('duration').notNull().default(''),
  /** Unit `duration` counts in — a `TIME_UNITS` key. */
  durationUnit: text('duration_unit').$type<TimeUnit>().notNull().default('round'),
  /** How many targets, same NR formula grammar as `duration`. */
  targets: text('targets').notNull().default(''),
  /**
   * What the spell DOES, as `SPELL_TAGS` keys — our taxonomy, not the
   * rulebook's. Drives the catalogue filter; carries no rules.
   */
  tags: text('tags', { mode: 'json' })
    .$type<string[]>()
    .notNull()
    .default(sql`'[]'`),

  // --- provenance: which catalogue entry this row was copied from ------------

  /**
   * The `SpellPreset.id` slug this spell was picked from, or NULL for a spell
   * the player wrote themselves. NULLABLE and never inferred: that asymmetry IS
   * the safety property — a rulebook correction may only ever touch rows that
   * can prove where they came from, so a hand-made sortilège is untouchable by
   * construction rather than by a name heuristic that could misfire.
   *
   * Rows created before this column exist stay NULL, i.e. read as hand-made.
   * Deliberate: no backfill ships with this (public beta, a handful of spells
   * per sheet — re-adding them from the catalogue is the cheaper migration).
   */
  presetId: text('preset_id'),
  /**
   * The preset's `revision` at the moment this row was copied (see
   * `lib/preset-revision`). Differs from the catalogue's current revision ⇒ the
   * entry was corrected since. Nothing acts on that yet; the column exists now
   * so a later "mettre à jour depuis le catalogue" flow has the history it
   * cannot reconstruct after the fact.
   */
  presetRevision: text('preset_revision'),
});

/**
 * A character's shields. One row per owned shield — a hybrid of `weapons`
 * (damage formula, prerequisites, creation, special — a shield can bash) and
 * `armor` (defenseMax/defenseCurrent, exclusive `equipped`). No category:
 * unlike armor's three weight classes, shields are one kind. No initiative
 * columns — unlike a weapon, a shield doesn't change turn order. Equip is
 * independent of both `armor.equipped` and any weapon's `equippedHand` — a
 * character can equip one armor + one shield + weapons simultaneously, with
 * no enforced interaction (see the "separate tables" note on `enchants`
 * below for why this isn't folded into `armor`).
 */
export const shields = sqliteTable('shields', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  characterId: integer('character_id')
    .notNull()
    .references(() => characters.id, { onDelete: 'cascade' }),
  name: text('name').notNull().default(''),
  damage: text('damage').notNull().default(''),
  prerequisites: text('prerequisites').notNull().default(''),
  creationDifficulty: integer('creation_difficulty').notNull().default(0),
  creationTime: real('creation_time').notNull().default(0),
  special: text('special').notNull().default(''),
  defenseMax: integer('defense_max').notNull().default(0),
  defenseCurrent: integer('defense_current').notNull().default(0),
  encombrementMalus: integer('encombrement_malus').notNull().default(0),
  equipped: integer('equipped', { mode: 'boolean' }).notNull().default(false),
});

/** Which kind of gear an enchant is bound to (see `enchants` below). */
export const ENCHANT_TARGETS = ['weapon', 'armor', 'item', 'shield'] as const;
export type EnchantTarget = (typeof ENCHANT_TARGETS)[number];

/**
 * An enchantment bound to one weapon/armor/item/shield — a character can
 * stack several on the same object (`targetType` + `targetId` is not
 * unique). Weapons/armor/items/shields are deliberately separate tables (very
 * different column shapes), so there's no single "equipment" table to FK
 * against: the target is a polymorphic pointer instead of a real FK. SQLite
 * can't cascade across four possible parent tables, so
 * `deleteWeapon`/`deleteArmor`/`deleteItem`/`deleteShield` each explicitly
 * purge matching rows here (repositories/enchants.ts `deleteEnchantsFor`)
 * before deleting the object itself.
 *
 * `sourceSpellName` is a display-only snapshot, frozen at creation — the
 * enchant may have been cast into the object by someone else's spell, so
 * `effect` is copied in (or typed directly for a from-scratch enchant) and
 * never re-reads the live spell. `sourceSpellId` is a *soft* link kept
 * alongside it purely so the UI can offer "view this spell" — `onDelete:
 * 'set null'` clears it if the source spell is later deleted, while
 * `sourceSpellName`/`effect` stay put as history. Using an enchant never
 * touches the magic reserve — `usesCurrent`/`usesMax` is its own independent
 * charge pool, ticked by hand like `magic_reserves`.
 */
export const enchants = sqliteTable('enchants', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  characterId: integer('character_id')
    .notNull()
    .references(() => characters.id, { onDelete: 'cascade' }),
  targetType: text('target_type', { enum: ENCHANT_TARGETS }).notNull(),
  targetId: integer('target_id').notNull(),
  name: text('name').notNull().default(''),
  sourceSpellName: text('source_spell_name'),
  sourceSpellId: integer('source_spell_id').references(() => spells.id, { onDelete: 'set null' }),
  effect: text('effect').notNull().default(''),
  usesMax: integer('uses_max').notNull().default(1),
  usesCurrent: integer('uses_current').notNull().default(1),
  createdAt: integer('created_at', { mode: 'timestamp_ms' })
    .notNull()
    .$defaultFn(() => new Date()),
});

/**
 * Magic reserve objects (issue #51): items a mage crafts or carries that hold
 * their own pool of magic puces — a gem, a staff, a talisman. Each row is an
 * INDEPENDENT pool: `max` puces total, `current` filled, spent on its own. The
 * character's global reserve (`characters.reserveMagiqueMax` /
 * `actual_state.reserveMagiqueCurrent`) is untouched, so the player always knows
 * which dots came from which object.
 *
 * Both the max and the current live here (unlike the sheet/state split used for
 * the character's own pools): an object is gear, it comes and goes with play,
 * and splitting one row across two tables would buy nothing.
 */
export const magicReserves = sqliteTable('magic_reserves', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  characterId: integer('character_id')
    .notNull()
    .references(() => characters.id, { onDelete: 'cascade' }),
  nom: text('nom').notNull().default(''),
  max: integer('max').notNull().default(0),
  current: integer('current').notNull().default(0),
  createdAt: integer('created_at', { mode: 'timestamp_ms' })
    .notNull()
    .$defaultFn(() => new Date()),
});

/**
 * Temporary bonuses/maluses applied to a character during play. Each row targets
 * one stat — a caractéristique key, an attribut key, or `'all'` (every roll) —
 * and carries a signed `value` (positive = bonus, negative = malus). Effects last
 * `durationRemaining` units of `durationUnit`; "time passes" controls tick a
 * single unit down by 1. An effect at 0 flips `expired` (kept in the list so the
 * player can renew or delete it) and stops counting toward roll modifiers.
 *
 * Wound maluses are NOT stored here — they derive live from `actual_state` wound
 * boxes (see `lib/modifiers`). Effects stack additively; the wound malus is the
 * single biggest active wound level (max, not sum).
 */
export const effects = sqliteTable('effects', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  characterId: integer('character_id')
    .notNull()
    .references(() => characters.id, { onDelete: 'cascade' }),
  label: text('label').notNull().default(''),
  // 'all' = every roll; otherwise a caractéristique or attribut key.
  target: text('target').notNull().default('all'),
  // Signed: positive = bonus, negative = malus.
  value: integer('value').notNull().default(0),
  // One of TIME_UNITS: 'action' | 'round' (« Tour ») | 'minute' | 'hour' | 'day',
  // or PERMANENT_UNIT. Plain text on purpose (no CHECK), so adding a unit to the
  // enum never needs a migration.
  durationUnit: text('duration_unit').notNull().default('round'),
  durationRemaining: integer('duration_remaining').notNull().default(0),
  expired: integer('expired', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at', { mode: 'timestamp_ms' })
    .notNull()
    .$defaultFn(() => new Date()),
});

/**
 * A table this device runs or plays at (docs/campaign-protocol.md §5). One row
 * per created/joined campaign. `role` fixes what the row means: `gm` rows may
 * carry the portable `gmToken` (proof of ownership — travels in backups so a GM
 * who changes phones keeps the campaign); `player` rows leave it null.
 *
 * A GM row is LOCAL-FIRST: `code`, `serverUrl` and `gmToken` are all nullable,
 * because a table exists (NPCs, roster, initiative) with no server at all. They
 * are filled when the GM attaches a relay to also see the players' characters
 * (repositories/campaigns.attachServer). A `player` row always has both — you
 * cannot join a table without a server to join through.
 */
export const campaigns = sqliteTable('campaigns', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  code: text('code'),
  name: text('name').notNull().default(''),
  role: text('role', { enum: ['gm', 'player'] }).notNull(),
  gmToken: text('gm_token'),
  serverUrl: text('server_url'),
  // Off by default: the GM's NPCs are rendered from the local DB and have no
  // reason to leave the device. Turning it on republishes them to the relay —
  // groundwork for a co-GM seeing the same NPCs (docs/campaign-protocol.md §2).
  shareNpcs: integer('share_npcs', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at', { mode: 'timestamp_ms' })
    .notNull()
    .$defaultFn(() => new Date()),
}, (table) => [
  // One local row per campaign — re-joining the same code updates, not
  // duplicates. Local tables have a NULL code; SQLite treats each NULL as
  // distinct, so any number of them coexist.
  uniqueIndex('campaigns_code_unique').on(table.code),
]);

/**
 * Membership: which local character belongs to which table.
 *  - player row: the characters broadcast to the GM (the share toggle).
 *  - gm row: the NPCs that make up the table's roster — read locally, and only
 *    published when `campaigns.shareNpcs` is on.
 */
export const campaignShares = sqliteTable('campaign_shares', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  campaignId: integer('campaign_id')
    .notNull()
    .references(() => campaigns.id, { onDelete: 'cascade' }),
  characterId: integer('character_id')
    .notNull()
    .references(() => characters.id, { onDelete: 'cascade' }),
});

/**
 * The GM's private notes about a roster character. GM device only — never sent
 * to the server or the player (docs/campaign-protocol.md §2). Keyed by the
 * character's portable uuid (`charUuid`), NOT a local FK: the subject character
 * lives on the player's phone, and the uuid survives the player changing devices.
 */
export const gmNotes = sqliteTable('gm_notes', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  campaignId: integer('campaign_id')
    .notNull()
    .references(() => campaigns.id, { onDelete: 'cascade' }),
  charUuid: text('char_uuid').notNull(),
  body: text('body').notNull().default(''),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
    .notNull()
    .$defaultFn(() => new Date()),
}, (table) => [
  uniqueIndex('gm_notes_campaign_char_unique').on(table.campaignId, table.charUuid),
]);

export type Character = typeof characters.$inferSelect;
export type NewCharacter = typeof characters.$inferInsert;
export type ActualState = typeof actualState.$inferSelect;
export type NewActualState = typeof actualState.$inferInsert;
export type Skill = typeof skills.$inferSelect;
export type NewSkill = typeof skills.$inferInsert;
export type Armor = typeof armor.$inferSelect;
export type NewArmor = typeof armor.$inferInsert;
export type Item = typeof items.$inferSelect;
export type NewItem = typeof items.$inferInsert;
export type Weapon = typeof weapons.$inferSelect;
export type NewWeapon = typeof weapons.$inferInsert;
export type Shield = typeof shields.$inferSelect;
export type NewShield = typeof shields.$inferInsert;
export type Spell = typeof spells.$inferSelect;
export type NewSpell = typeof spells.$inferInsert;
export type Enchant = typeof enchants.$inferSelect;
export type NewEnchant = typeof enchants.$inferInsert;
export type MagicReserve = typeof magicReserves.$inferSelect;
export type NewMagicReserve = typeof magicReserves.$inferInsert;
export type Effect = typeof effects.$inferSelect;
export type NewEffect = typeof effects.$inferInsert;
export type Campaign = typeof campaigns.$inferSelect;
export type NewCampaign = typeof campaigns.$inferInsert;
export type CampaignShare = typeof campaignShares.$inferSelect;
export type GmNote = typeof gmNotes.$inferSelect;
