// Specializations and the base-skill flush, against a real migrated database.
//
// A specialization's composite name (« Herboristerie (Curative) ») is what an
// effect targets — `skill:<name>` — so renaming one has to rewrite those
// targets or the bonus silently stops applying. And the base flush
// (`replaceSkills`) wipes base rows only: a specialization edited live must
// survive a debounced save of the rest of the sheet.

import { and, eq, isNotNull } from 'drizzle-orm';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { effects, skills } from '@/db/schema';
import { skillTarget } from '@/lib/modifiers';
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
const { createEffect } = await import('@/repositories/effects');
const { createSpecialization, deleteSpecialization, renameSpecialization, replaceSkills } =
  await import('@/repositories/skills');

beforeEach(() => {
  harness?.close();
  harness = createTestDb();
});

const MOTHER = { name: 'Herboristerie', attribut: 'mental', value: 3 };

async function setup() {
  const c = await createCharacter({ nom: 'Aldric' });
  await replaceSkills(c.id, [MOTHER]);
  await createSpecialization(c.id, MOTHER);
  const [spec] = await harness.db
    .select()
    .from(skills)
    .where(and(eq(skills.characterId, c.id), isNotNull(skills.parentName)));
  return { c, spec };
}

describe('createSpecialization', () => {
  it('starts from the mother’s value and attribut, unlabeled', async () => {
    const { spec } = await setup();
    expect(spec.name).toBe('Herboristerie (…)');
    expect(spec.parentName).toBe('Herboristerie');
    expect(spec.attribut).toBe('mental');
    expect(spec.value).toBe(3);
  });
});

describe('renameSpecialization', () => {
  it('recomputes the composite name and re-targets the effects on it', async () => {
    const { c, spec } = await setup();
    const fx = await createEffect(c.id, {
      label: 'Onguent',
      target: skillTarget(spec.name),
      value: 2,
      durationUnit: 'round',
      durationRemaining: 1,
    });

    await renameSpecialization(spec, 'Curative');

    const [renamed] = await harness.db.select().from(skills).where(eq(skills.id, spec.id));
    expect(renamed.name).toBe('Herboristerie (Curative)');
    expect(renamed.specLabel).toBe('Curative');
    const [effect] = await harness.db.select().from(effects).where(eq(effects.id, fx.id));
    expect(effect.target).toBe(skillTarget('Herboristerie (Curative)'));
  });
});

describe('deleteSpecialization', () => {
  it('removes the effects that targeted it and nothing else', async () => {
    const { c, spec } = await setup();
    await createEffect(c.id, { target: skillTarget(spec.name), value: 2, durationUnit: 'round' });
    const kept = await createEffect(c.id, { target: 'all', value: -1, durationUnit: 'round' });

    await deleteSpecialization(spec);

    expect((await harness.db.select().from(effects)).map((e) => e.id)).toEqual([kept.id]);
    expect(await harness.db.select().from(skills).where(eq(skills.id, spec.id))).toEqual([]);
  });
});

describe('replaceSkills', () => {
  it('rewrites the base rows and leaves specializations alone', async () => {
    const { c, spec } = await setup();
    await replaceSkills(c.id, [{ name: 'Herboristerie', attribut: 'mental', value: 5 }]);
    const rows = await harness.db.select().from(skills).where(eq(skills.characterId, c.id));
    expect(rows.find((r) => r.parentName == null)?.value).toBe(5);
    expect(rows.find((r) => r.id === spec.id)?.value).toBe(3);
  });

  it('drops a base skill at 0 rather than storing an untrained row', async () => {
    const c = await createCharacter({ nom: 'Aldric' });
    await replaceSkills(c.id, [
      { name: 'Escalade', attribut: 'physique', value: 0 },
      { name: 'Natation', attribut: 'physique', value: 2 },
    ]);
    const rows = await harness.db.select().from(skills).where(eq(skills.characterId, c.id));
    expect(rows.map((r) => r.name)).toEqual(['Natation']);
  });
});
