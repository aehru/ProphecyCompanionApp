// Starred catalogue entries — see the `favorites` table in schema.ts for why
// they are their own rows and not a flag on the owned tables.

import { and, eq } from 'drizzle-orm';

import { db } from '@/db/client';
import { favorites, type CatalogKind } from '@/db/schema';
import { logWrite } from '@/repositories/log';

/** Live query for one catalogue's stars (use with useLiveQuery). */
export function favoritesQuery(characterId: number, kind: CatalogKind) {
  return db
    .select({ presetId: favorites.presetId })
    .from(favorites)
    .where(and(eq(favorites.characterId, characterId), eq(favorites.kind, kind)));
}

/**
 * Star or unstar one entry. Takes the target state rather than flipping what it
 * finds: the caller already holds the set it rendered the star from, so a read
 * here would only be a slower way to learn the same thing — and two taps racing
 * would flip it twice into the same value.
 *
 * `onConflictDoNothing` leans on the unique index: starring something already
 * starred is the same statement made twice, not an error.
 */
export async function setFavorite(
  characterId: number,
  kind: CatalogKind,
  presetId: string,
  on: boolean,
) {
  if (on) {
    await db.insert(favorites).values({ characterId, kind, presetId }).onConflictDoNothing();
  } else {
    await db
      .delete(favorites)
      .where(
        and(
          eq(favorites.characterId, characterId),
          eq(favorites.kind, kind),
          eq(favorites.presetId, presetId),
        ),
      );
  }
  // `catalogId` rather than the row id: the slug is what says WHICH entry was
  // starred, and it is a generated code identifier, not anything a user typed.
  logWrite('favorites', on ? 'insert' : 'delete', { characterId, kind, catalogId: presetId });
}
