// iOS / Android persistence backend: two files in the app's private document
// directory (`logs/current.ndjson`, `logs/previous.ndjson`).
//
// Document rather than cache: the cache directory can be evicted by the OS at
// any moment, and the whole point of the previous-launch file is that it is
// still there after a crash. The two files together are bounded by the ring
// buffer's own caps (~1 MB worst case).
//
// Every operation is best-effort: a diagnostic log that throws would be worse
// than no diagnostic log at all.

import { Directory, File, Paths } from 'expo-file-system';

import type { LogSink, LogSlot } from './types';

const DIR_NAME = 'logs';
const FILE_NAMES: Record<LogSlot, string> = {
  current: 'current.ndjson',
  previous: 'previous.ndjson',
};

function logDirectory(): Directory {
  const dir = new Directory(Paths.document, DIR_NAME);
  try {
    if (!dir.exists) dir.create({ intermediates: true });
  } catch {
    // already there (race) or unwritable — the file ops below will no-op
  }
  return dir;
}

function fileFor(slot: LogSlot): File {
  return new File(logDirectory(), FILE_NAMES[slot]);
}

export function createLogSink(): LogSink {
  return {
    async read(slot) {
      try {
        const f = fileFor(slot);
        if (!f.exists) return null;
        return await f.text();
      } catch {
        return null;
      }
    },
    async write(slot, text) {
      try {
        const f = fileFor(slot);
        // Wholesale rewrite: drop the old file rather than append, so the file
        // never diverges from what the ring buffer actually holds.
        if (f.exists) f.delete();
        f.create();
        f.write(text);
      } catch {
        // disk full / sandbox denied — nothing to do but keep running
      }
    },
    async remove(slot) {
      try {
        const f = fileFor(slot);
        if (f.exists) f.delete();
      } catch {
        // already gone — ignore
      }
    },
  };
}

export const SINK_DESCRIPTION = 'dossier privé de l’application, sur cet appareil';
