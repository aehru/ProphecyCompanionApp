// Device-side glue for getting the log OFF the device — and the only code path
// that can. There is no server, no analytics endpoint and no automatic crash
// upload anywhere in the app: the OS share sheet (or the clipboard, at the
// user's own hand) is the whole export surface.
//
// Kept apart from `index.ts`, which stays free of native-module imports so the
// logger can be used from anywhere, including plain-Node contexts.

import * as Clipboard from 'expo-clipboard';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { buildReport } from './index';

/** `prophecy-diagnostic-2026-08-06.txt` — recognisable in a Files app. */
function reportFilename(d = new Date()): string {
  return `prophecy-diagnostic-${d.toISOString().slice(0, 10)}.txt`;
}

/**
 * Write the report to a cache file and open the share sheet. The file lands in
 * the cache directory on purpose — the OS reclaims it, and the copy the user
 * actually keeps is the one the share sheet produced.
 */
export async function shareDiagnostics(): Promise<void> {
  const text = await buildReport();
  const file = new File(Paths.cache, reportFilename());
  try {
    if (file.exists) file.delete();
  } catch {
    // stale temp — ignore
  }
  file.create();
  file.write(text);

  if (!(await Sharing.isAvailableAsync())) {
    throw new Error("Le partage n'est pas disponible sur cet appareil.");
  }
  await Sharing.shareAsync(file.uri, {
    mimeType: 'text/plain',
    dialogTitle: 'Partager le journal de diagnostic',
    UTI: 'public.plain-text',
  });
}

/** Same report, straight to the clipboard. Returns its length in characters. */
export async function copyDiagnostics(): Promise<number> {
  const text = await buildReport();
  await Clipboard.setStringAsync(text);
  return text.length;
}
