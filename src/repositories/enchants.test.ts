// The enchant ↔ source-spell link, against a real migrated database.
//
// An enchant may point at a sortilège the character does not know (`known:
// false`), a row that exists ONLY for that link. What is worth asserting is the
// pruning: an unknown source goes once nothing points at it, stays while
// something still does, and a KNOWN spell is never touched. The reference check
// has to run BEFORE the delete — `sourceSpellId` is `on delete set null`, so
// deleting a still-referenced spell would blank the other enchants' links
// instead of failing. Foreign keys are on in the harness for exactly that.

import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { enchants, spells } from '@/db/schema';
import { createTestDb, type TestDb } from '@/repositories/test-db';

let harness: TestDb;

vi.mock('@/db/client', () => ({
  get db() {
    return harness.db;
  },
  transaction: <T,>(body: (tx: unknown) => Promise<T>) => harness.transaction(body),
}));
vi.mock('@/lib/media', () => ({
  copyMedia: () => null,
  deleteMedia: () => {},
  deleteCharacterMedia: () => {},
}));
vi.mock('@/lib/log', () => ({
  log: { debug: () => {}, info: () => {}, warn: () => {}, error: () => {} },
}));

const { createCharacter } = await import('@/repositories/characters');
const { createSpell } = await import('@/repositories/spells');
const { createWeapon, deleteWeapon } = await import('@/repositories/weapons');
const { createEnchant, deleteEnchant, setEnchantSource } = await import(
  '@/repositories/enchants'
);

beforeEach(() => {
  harness?.close();
  harness = createTestDb();
});

const spellRows = () => harness.db.select().from(spells);
const enchantRow = async (id: number) =>
  (await harness.db.select().from(enchants).where(eq(enchants.id, id)))[0];

/** A character with one sword and one blank enchant on it. */
async function setup() {
  const c = await createCharacter({ nom: 'Aldric' });
  const sword = await createWeapon(c.id, { name: 'Épée' });
  const enchant = await createEnchant(c.id, 'weapon', sword.id);
  return { c, sword, enchant };
}

describe('setEnchantSource', () => {
  it('copies the spell onto the enchant and prefills its difficulté', async () => {
    const { c, enchant } = await setup();
    const spell = await createSpell(c.id, { name: 'Lueur', effect: 'Éclaire.', difficulty: 15 });
    await setEnchantSource(enchant.id, spell);
    const row = await enchantRow(enchant.id);
    expect(row.sourceSpellId).toBe(spell.id);
    expect(row.sourceSpellName).toBe('Lueur');
    expect(row.name).toBe('Lueur');
    expect(row.effect).toBe('Éclaire.');
    expect(row.difficulty).toBe(15);
  });

  it('prunes an unknown source once nothing points at it', async () => {
    const { c, enchant } = await setup();
    const hired = await createSpell(c.id, { name: 'Lueur', known: false });
    await setEnchantSource(enchant.id, hired);
    await setEnchantSource(enchant.id, null);
    expect(await spellRows()).toEqual([]);
    expect((await enchantRow(enchant.id)).sourceSpellId).toBeNull();
  });

  it('keeps an unknown source another enchant still uses', async () => {
    const { c, sword, enchant } = await setup();
    const other = await createEnchant(c.id, 'weapon', sword.id);
    const hired = await createSpell(c.id, { name: 'Lueur', known: false });
    await setEnchantSource(enchant.id, hired);
    await setEnchantSource(other.id, hired);

    await setEnchantSource(enchant.id, null);
    expect((await spellRows()).map((s) => s.id)).toEqual([hired.id]);
    // The trap: a delete-then-check would have blanked this one through the FK.
    expect((await enchantRow(other.id)).sourceSpellId).toBe(hired.id);
  });

  it('never prunes a known spell — it is the character’s, whatever the enchant does', async () => {
    const { c, enchant } = await setup();
    const known = await createSpell(c.id, { name: 'Lueur' });
    await setEnchantSource(enchant.id, known);
    await setEnchantSource(enchant.id, null);
    expect((await spellRows()).map((s) => s.id)).toEqual([known.id]);
  });
});

describe('deleteEnchant', () => {
  it('takes an orphaned unknown source with it', async () => {
    const { c, enchant } = await setup();
    const hired = await createSpell(c.id, { name: 'Lueur', known: false });
    await setEnchantSource(enchant.id, hired);
    await deleteEnchant(enchant.id);
    expect(await spellRows()).toEqual([]);
  });
});

describe('deleteWeapon', () => {
  it('drops the enchants bound to it, and their unknown sources', async () => {
    const { c, sword, enchant } = await setup();
    const hired = await createSpell(c.id, { name: 'Lueur', known: false });
    await setEnchantSource(enchant.id, hired);
    await deleteWeapon(sword.id);
    expect(await harness.db.select().from(enchants)).toEqual([]);
    expect(await spellRows()).toEqual([]);
  });
});
