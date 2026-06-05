import { asc, eq } from 'drizzle-orm';

import { db } from '@/db/client';
import { skills } from '@/db/schema';

/** Live query for a character's skills (use with useLiveQuery). */
export function skillsQuery(characterId: number) {
  return db.select().from(skills).where(eq(skills.characterId, characterId)).orderBy(asc(skills.name));
}

export type SkillInput = { name: string; attribut: string; value: number };

/**
 * Replace a character's whole skill set. Only skills with value > 0 are kept
 * (a character "doesn't have" a skill at 0, so we don't store it). Names are
 * trimmed and empty ones dropped.
 */
export async function replaceSkills(characterId: number, rows: SkillInput[]) {
  const keep = rows
    .map((r) => ({ name: r.name.trim(), attribut: r.attribut, value: r.value }))
    .filter((r) => r.name !== '' && r.value > 0);

  await db.transaction(async (tx) => {
    await tx.delete(skills).where(eq(skills.characterId, characterId));
    if (keep.length > 0) {
      await tx.insert(skills).values(keep.map((r) => ({ characterId, ...r })));
    }
  });
}
