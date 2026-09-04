// The campaign read-modify-writes, against a real migrated database.
//
// All three add a row only when one isn't already there, and none of the three
// pairs has a unique constraint behind it — so the transaction IS the constraint
// and these tests are what says so.
//
// Nothing here touches the network: every function under test is on the
// local-table path, which is the whole point of `createLocalTable` (a GM runs a
// table with no relay attached, forever).

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

const { createLocalTable, createNpc, setMember, spawnNpc, upsertGmNote } = await import(
  '@/repositories/campaigns'
);
const { createCharacter } = await import('@/repositories/characters');
const { createWeapon } = await import('@/repositories/weapons');

beforeEach(() => {
  harness?.close();
  harness = createTestDb();
});

const memberIds = (campaignId: number) =>
  harness.raw
    .prepare('SELECT character_id AS id FROM campaign_shares WHERE campaign_id = ? ORDER BY id')
    .all(campaignId)
    .map((r) => (r as { id: number }).id);

describe('createLocalTable', () => {
  it('is a table with no relay: no code, no server, no token', async () => {
    const table = await createLocalTable('Les Cendres');
    expect(table.role).toBe('gm');
    expect(table.code).toBeNull();
    expect(table.serverUrl).toBeNull();
    expect(table.gmToken).toBeNull();
    // NPCs stay on the device unless the GM opts in.
    expect(table.shareNpcs).toBe(false);
  });
});

describe('setMember', () => {
  it('adds a character once, however many times it is asked', async () => {
    const table = await createLocalTable('Les Cendres');
    const c = await createCharacter({ nom: 'Aldric' });
    await setMember(table.id, c.id, true);
    await setMember(table.id, c.id, true);
    expect(memberIds(table.id)).toEqual([c.id]);
  });

  it('removes a character, and removing one that is not there is a no-op', async () => {
    const table = await createLocalTable('Les Cendres');
    const c = await createCharacter({ nom: 'Aldric' });
    await setMember(table.id, c.id, true);
    await setMember(table.id, c.id, false);
    await setMember(table.id, c.id, false);
    expect(memberIds(table.id)).toEqual([]);
  });

  it('keeps tables apart — the same character can sit at two', async () => {
    const one = await createLocalTable('Les Cendres');
    const two = await createLocalTable('Le Gouffre');
    const c = await createCharacter({ nom: 'Aldric' });
    await setMember(one.id, c.id, true);
    await setMember(two.id, c.id, true);
    await setMember(one.id, c.id, false);
    expect(memberIds(one.id)).toEqual([]);
    expect(memberIds(two.id)).toEqual([c.id]);
  });
});

describe('createNpc', () => {
  it('creates an NPC row and seats it in one step', async () => {
    const table = await createLocalTable('Les Cendres');
    const { id } = await createNpc(table.id, '  Garde  ');
    const row = harness.raw.prepare('SELECT nom, kind FROM characters WHERE id = ?').get(id);
    expect(row).toEqual({ nom: 'Garde', kind: 'npc' });
    expect(memberIds(table.id)).toEqual([id]);
  });

  it('names a blank NPC rather than creating a nameless one', async () => {
    const table = await createLocalTable('Les Cendres');
    const { id } = await createNpc(table.id, '   ');
    expect(harness.raw.prepare('SELECT nom FROM characters WHERE id = ?').get(id)).toEqual({
      nom: 'PNJ',
    });
  });
});

describe('spawnNpc', () => {
  it('copies the NPC, numbers it into the series and seats it', async () => {
    const table = await createLocalTable('Les Cendres');
    const { id: sourceId } = await createNpc(table.id, 'Garde');
    await createWeapon(sourceId, { name: 'Hallebarde' });
    const source = harness.raw.prepare('SELECT uuid FROM characters WHERE id = ?').get(sourceId) as {
      uuid: string;
    };

    const spawned = await spawnNpc(table.id, source.uuid);
    expect(spawned).not.toBeNull();
    // Numbered into the source's series, never suffixed « (copie) ».
    expect(spawned!.nom).toBe('Garde 2');
    expect(memberIds(table.id).sort((a, b) => a - b)).toEqual(
      [sourceId, spawned!.id].sort((a, b) => a - b),
    );

    const copy = harness.raw
      .prepare('SELECT nom, kind, uuid FROM characters WHERE id = ?')
      .get(spawned!.id) as { nom: string; kind: string; uuid: string };
    expect(copy.kind).toBe('npc');
    // A fresh lineage: two copies must not fight over one roster slot.
    expect(copy.uuid).not.toBe(source.uuid);
    // The gear came along — three gardes, three wound tracks, three halberds.
    expect(
      harness.raw.prepare('SELECT name FROM weapons WHERE character_id = ?').all(spawned!.id),
    ).toEqual([{ name: 'Hallebarde' }]);
    // And its own state row, so wounds are tracked separately.
    expect(
      harness.raw.prepare('SELECT COUNT(*) AS n FROM actual_state WHERE character_id = ?').get(spawned!.id),
    ).toEqual({ n: 1 });
  });

  it('marks a spawn as an NPC even when the source is a player character', async () => {
    const table = await createLocalTable('Les Cendres');
    const pc = await createCharacter({ nom: 'Aldric', kind: 'pc' });
    await setMember(table.id, pc.id, true);
    const spawned = await spawnNpc(table.id, pc.uuid!);
    expect(
      harness.raw.prepare('SELECT kind FROM characters WHERE id = ?').get(spawned!.id),
    ).toEqual({ kind: 'npc' });
  });

  it('returns null for a uuid this device does not hold', async () => {
    const table = await createLocalTable('Les Cendres');
    expect(await spawnNpc(table.id, 'not-a-uuid-here')).toBeNull();
  });
});

describe('upsertGmNote', () => {
  it('writes one note per character and replaces it on the next save', async () => {
    const table = await createLocalTable('Les Cendres');
    const uuid = 'char-uuid-1';
    await upsertGmNote(table.id, uuid, 'Ment sur son passé.');
    await upsertGmNote(table.id, uuid, 'Ment, et le sait.');
    const rows = harness.raw
      .prepare('SELECT body FROM gm_notes WHERE campaign_id = ? AND char_uuid = ?')
      .all(table.id, uuid);
    expect(rows).toEqual([{ body: 'Ment, et le sait.' }]);
  });

  it('keeps notes about different characters apart', async () => {
    const table = await createLocalTable('Les Cendres');
    await upsertGmNote(table.id, 'a', 'Note A');
    await upsertGmNote(table.id, 'b', 'Note B');
    expect(
      harness.raw.prepare('SELECT COUNT(*) AS n FROM gm_notes WHERE campaign_id = ?').get(table.id),
    ).toEqual({ n: 2 });
  });
});
