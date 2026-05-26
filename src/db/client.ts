import { drizzle } from 'drizzle-orm/expo-sqlite';
import { openDatabaseSync } from 'expo-sqlite';

import * as schema from './schema';

// v1 = first single squashed migration. Bumping the filename starts a fresh DB
// so the old multi-migration journal on existing installs doesn't conflict.
export const DATABASE_NAME = 'prophecy-v3.db';

// enableChangeListener powers Drizzle's useLiveQuery reactivity.
const expoDb = openDatabaseSync(DATABASE_NAME, { enableChangeListener: true });

export const db = drizzle(expoDb, { schema });
