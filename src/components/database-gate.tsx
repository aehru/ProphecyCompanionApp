// The gate between the app and its database: it runs the migrations, and owns
// what the user sees while they run or when they fail.
//
// A component rather than a hook because Drizzle's `useMigrations` migrates
// ONCE per mount and offers no retry of its own — so « Réessayer » is literally
// a remount, which the parent performs by bumping this element's `key`.
//
// Three failure shapes, deliberately kept apart (see lib/storage-lock):
//  - LOCKED (web): another window of the same origin holds the exclusive OPFS
//    lock. Nothing was opened, so nothing was migrated — restoring the snapshot
//    or wiping the DB here would destroy good data over a stray browser tab.
//  - PROD: restore the pre-migration snapshot, never wipe.
//  - DEV: wipe and reload once, guarded by a flag so a genuinely broken
//    migration shows its error instead of looping.

import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, DevSettings, StyleSheet, View } from 'react-native';
import { Button, Text } from 'react-native-paper';

import { clearBackup, restoreDatabase } from '@/db/backup';
import { closeConnection, db, resetDatabase } from '@/db/client';
import { useMigrations } from '@/db/use-migrations';
import { describeError } from '@/lib/error-chain';
import { log } from '@/lib/log';
import { isStorageLockError } from '@/lib/storage-lock';
import { backfillCharacterUuids } from '@/repositories/characters';
import migrations from '../../drizzle/migrations';

const RESET_FLAG = 'db_reset_attempted';

/** What the user is shown once the database is definitively unavailable. */
type Failure = { locked: boolean; detail: string };

type Props = {
  /** Fonts load in parallel with the migrations; both must land before the app shows. */
  fontsLoaded: boolean;
  /** Remounts this gate, which re-runs the migrations from scratch. */
  onRetry: () => void;
  children: React.ReactNode;
};

export default function DatabaseGate({ fontsLoaded, onRetry, children }: Props) {
  const { success, error } = useMigrations(db, migrations);
  const [failure, setFailure] = useState<Failure | null>(null);

  useEffect(() => {
    if (!error) return;
    const locked = isStorageLockError(error);
    log.error('db.migrate.failed', error, { phase: __DEV__ ? 'dev' : 'prod', locked });
    let cancelled = false;
    (async () => {
      // A locked database was never opened, let alone migrated. Say so and offer
      // the retry — no restore, no reset, nothing to undo.
      if (locked) {
        if (!cancelled) setFailure({ locked: true, detail: describeError(error) });
        return;
      }
      if (!__DEV__) {
        // Recover the pre-migration snapshot so a failed prod migration doesn't
        // leave a broken/half-migrated DB. The user's data is preserved for the
        // next launch (or a future retry/export flow) instead of being wiped.
        // The connection must be closed before the file is swapped underneath it.
        await closeConnection();
        const restored = restoreDatabase();
        log.warn('db.restore', { restored });
        if (!cancelled) setFailure({ locked: false, detail: describeError(error) });
        return;
      }
      const tried = await AsyncStorage.getItem(RESET_FLAG);
      if (tried) {
        if (!cancelled) setFailure({ locked: false, detail: describeError(error) });
        return;
      }
      await AsyncStorage.setItem(RESET_FLAG, '1');
      log.warn('db.reset', { reason: 'migration-failed' });
      await resetDatabase();
      DevSettings.reload();
    })();
    return () => {
      cancelled = true;
    };
  }, [error]);

  useEffect(() => {
    if (!success) return;
    log.info('db.migrate.ok');
    // Migration went through — the pre-migration snapshot is no longer needed.
    clearBackup();
    AsyncStorage.removeItem(RESET_FLAG);
    // Fill portable uuids on characters that predate the column. Best-effort:
    // idempotent (NULL-only) and never blocks the UI.
    backfillCharacterUuids().catch(() => {});
  }, [success]);

  if (failure) return <FailureScreen failure={failure} onRetry={onRetry} />;

  if (!success || !fontsLoaded) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
      </View>
    );
  }

  return <>{children}</>;
}

/**
 * The dead-end screen. The locked case gets an explanation and an action,
 * because it is the one the user can actually fix; a real database error still
 * shows its cause chain, which is what a bug report needs.
 */
function FailureScreen({ failure, onRetry }: { failure: Failure; onRetry: () => void }) {
  return (
    <View style={styles.centered}>
      <Text variant="titleMedium" style={styles.title}>
        {failure.locked ? 'Base de données verrouillée' : 'Erreur de base de données'}
      </Text>
      {failure.locked ? (
        <>
          <Text variant="bodyMedium" style={styles.body}>
            L&apos;application est déjà ouverte dans un autre onglet ou une autre fenêtre. Un seul
            onglet à la fois peut accéder à vos données — aucune donnée n&apos;a été perdue.
          </Text>
          <Text variant="bodyMedium" style={styles.body}>
            Fermez les autres onglets de l&apos;application, puis réessayez. Sur Android, fermez
            complètement le navigateur (Paramètres → Applications → Forcer l&apos;arrêt) : l&apos;onglet
            reste actif en arrière-plan même après avoir été fermé.
          </Text>
        </>
      ) : (
        <Text variant="bodyMedium" style={styles.body}>
          {failure.detail}
        </Text>
      )}
      <Button mode="contained" onPress={onRetry} style={styles.action}>
        Réessayer
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  title: { marginBottom: 12, textAlign: 'center' },
  body: { marginBottom: 12, textAlign: 'center', maxWidth: 420 },
  action: { marginTop: 8 },
});
