// Web counterpart to ./share — the only code path that can get the log off the
// machine, exactly as on native.
//
// A browser has no OS share sheet, so the report is saved as a download instead.
// The privacy contract is unchanged and is worth restating, because this is the
// module where it could quietly be broken: there is no server, no analytics
// endpoint and no automatic upload anywhere in the app. Nothing here transmits
// the report — the user saves or copies it, then decides what to do with it.

import { downloadFile } from '@/lib/web-download';

import { buildReport } from './index';

/** `prophecy-diagnostic-2026-08-15.txt` — recognisable in a downloads folder. */
function reportFilename(d = new Date()): string {
  return `prophecy-diagnostic-${d.toISOString().slice(0, 10)}.txt`;
}

/** Save the report as a text file. */
export async function shareDiagnostics(): Promise<void> {
  const text = await buildReport();
  downloadFile(reportFilename(), new Blob([text], { type: 'text/plain' }));
}

/**
 * Same report, straight to the clipboard. Returns its length in characters.
 *
 * The Clipboard API needs a secure context and a user gesture; both hold when
 * this runs from the Diagnostic screen's button. It is still absent in some
 * browsers, and a silent no-op would look like the button did nothing — so say
 * so, in the language the screen is written in.
 */
export async function copyDiagnostics(): Promise<number> {
  const text = await buildReport();
  if (!navigator.clipboard?.writeText) {
    throw new Error("Le presse-papiers n'est pas disponible dans ce navigateur.");
  }
  await navigator.clipboard.writeText(text);
  return text.length;
}
