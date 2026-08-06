// The app-wide diagnostic log: the one place the pure engine (`logger.ts`), the
// platform sink and the persisted level are wired together.
//
// Everything the rest of the app needs is here — `log.info(...)`, the level
// setter, the launch init, and the report builder the Share sheet uses.
//
// Retention, decided once at launch:
//   1. `current` (the previous launch's file) is rotated onto `previous`;
//   2. `previous` is dropped when every entry in it falls outside the 7-day
//      window — so nothing older than a week can ever be shared;
//   3. the ring buffer starts empty, i.e. the live tail is THIS launch.

import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

import { Logger } from './logger';
import { createLogSink, SINK_DESCRIPTION } from './sink';
import { SESSION_ID } from './session';
import {
  formatReport,
  parseEntries,
  pruneOlderThan,
  RETENTION_MS,
  serializeEntries,
} from './serialize';
import { isLogLevel, type LogEntry, type LogLevel } from './types';

const LEVEL_STORAGE_KEY = 'diag.level';

/** Verbose by default in development, quiet in a released build. */
export const DEFAULT_LEVEL: LogLevel = __DEV__ ? 'debug' : 'info';

export const APP_VERSION = Constants.expoConfig?.version ?? 'dev';

/** Human-readable answer to "where is this stored?" for the Privacy screen. */
export { SINK_DESCRIPTION };

const sink = createLogSink();

/**
 * The singleton. Import this and call `log.info('event.name', { characterId })`.
 *
 * It starts WITHOUT a sink: anything logged before `initDiagnostics` finishes
 * stays in memory, so an early flush cannot overwrite `current` while it is
 * still the previous launch's file waiting to be rotated.
 */
export const log = new Logger({
  level: DEFAULT_LEVEL,
  sessionId: SESSION_ID,
});

let initialized = false;

/**
 * Restore the persisted level, rotate the files and purge past the retention
 * window. Idempotent and best-effort — called once from the root layout, and it
 * never blocks the UI.
 */
export async function initDiagnostics(): Promise<void> {
  if (initialized) return;
  initialized = true;

  try {
    const stored = await AsyncStorage.getItem(LEVEL_STORAGE_KEY);
    if (isLogLevel(stored)) log.setLevel(stored);
  } catch {
    // no stored preference — keep the default
  }

  const cutoff = Date.now() - RETENTION_MS;
  try {
    const previousLaunch = await sink.read('current');
    const kept = pruneOlderThan(parseEntries(previousLaunch), cutoff);
    if (kept.length > 0) {
      await sink.write('previous', serializeEntries(kept));
    } else {
      await sink.remove('previous');
    }
    await sink.remove('current');
  } catch {
    // rotation is best-effort; a failure only costs the previous launch's file
  }

  // Rotation is done — writing `current` is now safe.
  log.setSink(sink);

  log.info('app.launch', {
    version: APP_VERSION,
    platform: Platform.OS,
    level: log.getLevel(),
    sessionId: SESSION_ID,
  });
}

/** Change the level and remember it across launches. */
export async function setLogLevel(level: LogLevel): Promise<void> {
  log.setLevel(level);
  log.info('diag.level', { level });
  try {
    await AsyncStorage.setItem(LEVEL_STORAGE_KEY, level);
  } catch {
    // the level still applies to this launch
  }
}

/**
 * Everything shareable: the previous launch's file plus this launch's buffer,
 * both pruned to the retention window, oldest first.
 */
export async function collectEntries(): Promise<LogEntry[]> {
  const cutoff = Date.now() - RETENTION_MS;
  let previous: LogEntry[] = [];
  try {
    previous = pruneOlderThan(parseEntries(await sink.read('previous')), cutoff);
  } catch {
    previous = [];
  }
  return [...previous, ...pruneOlderThan(log.entries(), cutoff)];
}

/** The text a tester actually sends: header + entries. */
export async function buildReport(): Promise<string> {
  return formatReport(await collectEntries(), {
    appVersion: APP_VERSION,
    platform: Platform.OS,
    level: log.getLevel(),
    sessionId: SESSION_ID,
  });
}

export { SESSION_ID };
export { formatEntry, formatTime, RETENTION_MS } from './serialize';
export * from './types';
