import { sql } from 'drizzle-orm';
import { check, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

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

  // Identity
  nom: text('nom').notNull().default(''),
  concept: text('concept').notNull().default(''),

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
}, () => [
  // Tendance puces are always 0–10, enforced at the DB level.
  // Use raw unqualified column names — SQLite rejects table-qualified names in a CHECK.
  check('dragon_sub_range', sql`dragon_sub >= 0 AND dragon_sub <= 10`),
  check('fatalite_sub_range', sql`fatalite_sub >= 0 AND fatalite_sub <= 10`),
  check('homme_sub_range', sql`homme_sub >= 0 AND homme_sub <= 10`),
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

  // Current-turn initiative values (X = the character's initiativeMax)
  initiativeValues: text('initiative_values', { mode: 'json' })
    .$type<number[]>()
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
});

/**
 * A character's armor catalogue. One row per owned armor (a character can hold
 * several and swap between them across a campaign). `equipped` marks the single
 * active armor — enforced one-at-a-time in the repository. `defenseMax` is the
 * armor's full protection; `defenseCurrent` drops as it absorbs hits in a fight
 * (floored at 0 = broken, but kept until the player deletes it).
 */
export const armor = sqliteTable('armor', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  characterId: integer('character_id')
    .notNull()
    .references(() => characters.id, { onDelete: 'cascade' }),
  name: text('name').notNull().default(''),
  defenseMax: integer('defense_max').notNull().default(0),
  defenseCurrent: integer('defense_current').notNull().default(0),
  equipped: integer('equipped', { mode: 'boolean' }).notNull().default(false),
});

/**
 * A character's weapon catalogue. One row per owned weapon (plain list — no
 * equipped flag yet; add one later mirroring `armor` if dual-wield/equip is
 * needed). `damage`, `prerequisites`, `rangeEffective` and `rangeMax` hold raw
 * formula strings (e.g. `FOR x2 +3 +1D10`) parsed/computed at display by
 * `lib/formula`; range columns are nullable (null = melee weapon, no range).
 * The two initiative columns are plain signed ints (display-only for now).
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
  creationTime: integer('creation_time').notNull().default(0),
  initMelee: integer('init_melee').notNull().default(0),
  initCorpsACorps: integer('init_corps_a_corps').notNull().default(0),
  special: text('special').notNull().default(''),
  rangeEffective: text('range_effective'),
  rangeMax: text('range_max'),
});

export type Character = typeof characters.$inferSelect;
export type NewCharacter = typeof characters.$inferInsert;
export type ActualState = typeof actualState.$inferSelect;
export type NewActualState = typeof actualState.$inferInsert;
export type Skill = typeof skills.$inferSelect;
export type NewSkill = typeof skills.$inferInsert;
export type Armor = typeof armor.$inferSelect;
export type NewArmor = typeof armor.$inferInsert;
export type Weapon = typeof weapons.$inferSelect;
export type NewWeapon = typeof weapons.$inferInsert;
