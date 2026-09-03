// The character-scoped read-modify-writes, against a real migrated database.
//
// Each of these reads a row, decides something from it, and writes somewhere
// else — so each runs in a transaction, and what is worth asserting is the
// DECISION, not the SQL: a pool tops up only the first time its maximum becomes
// known, the first armour equips itself and the second does not, a bulk roll
// leaves every PNJ rolled or none.

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createTestDb, type TestDb } from '@/repositories/test-db';

let harness: TestDb;

vi.mock('@/db/client', () => ({
  get db() {
    return harness.db;
  },
  transaction: <T,>(body: (tx: unknown) => Promise<T>) => harness.transaction(body),
}));
// Reach React Native, and neither is what this file is about — see transfer.test.ts.
vi.mock('@/lib/media', () => ({
  copyMedia: () => null,
  deleteMedia: () => {},
  deleteCharacterMedia: () => {},
}));
vi.mock('@/lib/log', () => ({
  log: { debug: () => {}, info: () => {}, warn: () => {}, error: () => {} },
}));

const { createCharacter, updateCharacter, rollInitiativeFor } = await import(
  '@/repositories/characters'
);
const { createArmor, equipArmor } = await import('@/repositories/armor');
const { getActualState, updateActualState } = await import('@/repositories/actual-state');

beforeEach(() => {
  harness?.close();
  harness = createTestDb();
});

describe('updateCharacter', () => {
  it('fills a magic pool the first time its maximum becomes known', async () => {
    const c = await createCharacter({ nom: 'Aldric' });
    expect((await getActualState(c.id))?.reserveMagiqueCurrent).toBe(0);

    await updateCharacter(c.id, { reserveMagiqueMax: 6 });
    expect((await getActualState(c.id))?.reserveMagiqueCurrent).toBe(6);
  });

  it('leaves the current value alone once the pool is already known', async () => {
    const c = await createCharacter({ nom: 'Aldric', reserveMagiqueMax: 6 });
    // Spend some, then raise the maximum: the spent bullets stay spent.
    await updateActualState(c.id, { reserveMagiqueCurrent: 2 });
    await updateCharacter(c.id, { reserveMagiqueMax: 9 });
    expect((await getActualState(c.id))?.reserveMagiqueCurrent).toBe(2);
  });

  it('does not touch a pool whose maximum was not in the patch', async () => {
    const c = await createCharacter({ nom: 'Aldric' });
    await updateActualState(c.id, { reserveMagiqueCurrent: 3 });
    await updateCharacter(c.id, { nom: 'Aldric le Sage' });
    expect((await getActualState(c.id))?.reserveMagiqueCurrent).toBe(3);
  });

  it('returns the updated row', async () => {
    const c = await createCharacter({ nom: 'Aldric' });
    const row = await updateCharacter(c.id, { nom: 'Brahim' });
    expect(row.nom).toBe('Brahim');
  });
});

describe('createArmor', () => {
  it('equips the first piece and only the first', async () => {
    const c = await createCharacter({ nom: 'Aldric' });
    const first = await createArmor(c.id, { name: 'Cuir' });
    const second = await createArmor(c.id, { name: 'Maille' });
    expect(first.equipped).toBe(true);
    expect(second.equipped).toBe(false);
  });

  it('defaults the current defence to the maximum — an undamaged piece', async () => {
    const c = await createCharacter({ nom: 'Aldric' });
    const armor = await createArmor(c.id, { name: 'Maille', defenseMax: 7 });
    expect(armor.defenseCurrent).toBe(7);
  });

  it('counts per character, so another sheet’s wardrobe does not block the first equip', async () => {
    const a = await createCharacter({ nom: 'Aldric' });
    const b = await createCharacter({ nom: 'Brahim' });
    await createArmor(a.id, { name: 'Cuir' });
    expect((await createArmor(b.id, { name: 'Cuir' })).equipped).toBe(true);
  });

  it('keeps exactly one piece equipped after an explicit equip', async () => {
    const c = await createCharacter({ nom: 'Aldric' });
    await createArmor(c.id, { name: 'Cuir' });
    const second = await createArmor(c.id, { name: 'Maille' });
    await equipArmor(c.id, second.id);
    const equipped = harness.raw
      .prepare('SELECT name FROM armor WHERE character_id = ? AND equipped = 1')
      .all(c.id);
    expect(equipped).toEqual([{ name: 'Maille' }]);
  });
});

describe('rollInitiativeFor', () => {
  it('rolls every character named, keyed by uuid', async () => {
    const a = await createCharacter({ nom: 'Aldric', initiativeMax: 2 });
    const b = await createCharacter({ nom: 'Brahim', initiativeMax: 1 });
    const rolled = await rollInitiativeFor([a.uuid!, b.uuid!]);
    expect(rolled).toBe(2);
    expect((await getActualState(a.id))?.initiativeValues).toHaveLength(2);
    expect((await getActualState(b.id))?.initiativeValues).toHaveLength(1);
  });

  it('counts the temporary bonus dice, not just the sheet maximum', async () => {
    const c = await createCharacter({ nom: 'Aldric', initiativeMax: 1 });
    await updateActualState(c.id, { initiativeBonusDice: 2 });
    await rollInitiativeFor([c.uuid!]);
    expect((await getActualState(c.id))?.initiativeValues).toHaveLength(3);
  });

  it('skips a character with no die in play rather than giving it an empty roll', async () => {
    const none = await createCharacter({ nom: 'Sans dé', initiativeMax: 0 });
    const some = await createCharacter({ nom: 'Aldric', initiativeMax: 1 });
    expect(await rollInitiativeFor([none.uuid!, some.uuid!])).toBe(1);
    expect((await getActualState(none.id))?.initiativeValues ?? []).toHaveLength(0);
  });

  it('carries each die’s mark along with its own roll', async () => {
    const c = await createCharacter({ nom: 'Aldric', initiativeMax: 2 });
    await updateActualState(c.id, { initiativeDiceIcons: ['sword', 'shield'] });
    await rollInitiativeFor([c.uuid!]);
    // Sorted highest-first, so which mark ends up where depends on the roll —
    // what must hold is that both marks survived, neither invented nor dropped.
    const icons = (await getActualState(c.id))?.initiativeDiceIcons ?? [];
    expect([...icons].sort()).toEqual(['shield', 'sword']);
  });

  it('is a no-op for an empty list', async () => {
    expect(await rollInitiativeFor([])).toBe(0);
  });
});
