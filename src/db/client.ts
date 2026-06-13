import { drizzle } from 'drizzle-orm/expo-sqlite';
import { deleteDatabaseSync, openDatabaseSync } from 'expo-sqlite';

import * as schema from './schema';

export const DATABASE_NAME = 'prophecy.db';

// enableChangeListener powers Drizzle's useLiveQuery reactivity.
const expoDb = openDatabaseSync(DATABASE_NAME, { enableChangeListener: true });

export const db = drizzle(expoDb, { schema });

/** Close + delete the DB (used to auto-heal a failed/stale migration). */
export function resetDatabase() {
  try {
    expoDb.closeSync();
  } catch {
    // already closed — ignore
  }
  try {
    deleteDatabaseSync(DATABASE_NAME);
  } catch {
    // not present — ignore
  }
}
