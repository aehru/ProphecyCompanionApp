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
  egratinureMax: integer('egratinure_max').notNull().default(0),
  legereMax: integer('legere_max').notNull().default(0),
  graveMax: integer('grave_max').notNull().default(0),
  fataleMax: integer('fatale_max').notNull().default(0),
  mortMax: integer('mort_max').notNull().default(0),

  // Resource pools — max set at creation, current value changes in play
  maitriseMax: integer('maitrise_max').notNull().default(0),
  chanceMax: integer('chance_max').notNull().default(0),
  // Number of initiative actions/dice per turn
  initiativeMax: integer('initiative_max').notNull().default(0),

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
  egratinureCurrent: integer('egratinure_current').notNull().default(0),
  legereCurrent: integer('legere_current').notNull().default(0),
  graveCurrent: integer('grave_current').notNull().default(0),
  fataleCurrent: integer('fatale_current').notNull().default(0),
  mortCurrent: integer('mort_current').notNull().default(0),

  // Resource pools — current in-play value (max lives on the character)
  maitriseCurrent: integer('maitrise_current').notNull().default(0),
  chanceCurrent: integer('chance_current').notNull().default(0),

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

export type Character = typeof characters.$inferSelect;
export type NewCharacter = typeof characters.$inferInsert;
export type ActualState = typeof actualState.$inferSelect;
export type NewActualState = typeof actualState.$inferInsert;
