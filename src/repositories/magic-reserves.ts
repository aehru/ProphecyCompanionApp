import { asc, eq } from 'drizzle-orm';

import { db } from '@/db/client';
import { magicReserves, type NewMagicReserve } from '@/db/schema';

/** Live query for a character's magic reserve objects (use with useLiveQuery). */
export function magicReservesQuery(characterId: number) {
  return db
    .select()
    .from(magicReserves)
    .where(eq(magicReserves.characterId, characterId))
    .orderBy(asc(magicReserves.id));
}

/**
 * Add a reserve object. A new object comes in FULL (`current = max`): the mage
 * charged it before carrying it, and starting empty would mean tapping every
 * bullet on creation.
 */
export async function createMagicReserve(
  characterId: number,
  data: Partial<NewMagicReserve> = {},
) {
  const max = data.max ?? 0;
  const [row] = await db
    .insert(magicReserves)
    .values({ characterId, current: max, ...data })
    .returning();
  return row;
}

/**
 * Update an object. Lowering `max` clamps `current` so a shrunk pool can't stay
 * over-filled (the UI would render fewer bullets than the stored value).
 */
export async function updateMagicReserve(id: number, data: Partial<NewMagicReserve>) {
  const patch = { ...data };
  if (patch.max != null && patch.current == null) {
    const [row] = await db
      .select({ current: magicReserves.current })
      .from(magicReserves)
      .where(eq(magicReserves.id, id));
    if (row && row.current > patch.max) patch.current = patch.max;
  }
  await db.update(magicReserves).set(patch).where(eq(magicReserves.id, id));
}

export async function deleteMagicReserve(id: number) {
  await db.delete(magicReserves).where(eq(magicReserves.id, id));
}
