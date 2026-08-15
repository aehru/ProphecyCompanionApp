// Web glue for character export / import — the counterpart to
// ./character-transfer-io, which is built on expo-file-system / sharing /
// document-picker and cannot run in a browser (that includes a Tauri webview).
//
// A browser has no share sheet and no writable filesystem, so the two operations
// become the web's equivalents: an export is a download, an import is a file
// picker. The envelope itself is built upstream by the pure `character-transfer`
// module, exactly as on native — only the delivery differs.
//
// This matters more than it looks: on web the database lives in OPFS, scoped to
// the origin and erasable by "clear browsing data", and there is no
// pre-migration snapshot (see db/backup.web). Export is the ONLY way a user can
// get their characters off the platform or onto another device. Keep it working.

import {
  type ExportIntent,
  exportFileName,
  serializeExport,
  type ProphecyExport,
} from '@/lib/character-transfer';
import { downloadFile } from '@/lib/web-download';

/**
 * Download the export as a `.json` file.
 *
 * `intent` shapes the filename exactly as it does on native
 * (`prophecy-sauvegarde-…` vs `prophecy-partage-…`), which is what stops someone
 * re-importing the wrong file later — the two are indistinguishable by content.
 */
export async function shareExport(
  exp: ProphecyExport,
  intent: ExportIntent = 'backup',
): Promise<void> {
  const blob = new Blob([serializeExport(exp)], { type: 'application/json' });
  downloadFile(exportFileName(exp, intent), blob);
}

/**
 * Open a file picker and read the chosen file's text. Resolves null if the user
 * cancels. The raw string goes to `parseImport` for validation, same as native.
 */
export function pickImportText(): Promise<string | null> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';
    input.style.display = 'none';

    let done = false;
    let cancelTimer: ReturnType<typeof setTimeout> | null = null;
    const cleanup = () => {
      if (cancelTimer) clearTimeout(cancelTimer);
      window.removeEventListener('focus', onFocus);
      input.remove();
    };
    const finish = (text: string | null) => {
      if (done) return;
      done = true;
      cleanup();
      resolve(text);
    };
    const fail = (err: unknown) => {
      if (done) return;
      done = true;
      cleanup();
      reject(err);
    };

    // Cancelling a file dialog fires `cancel` in current browsers, but not in
    // every one we might be opened in. Without a fallback the promise would
    // never settle and the caller's spinner would hang forever, so treat "focus
    // came back and no file arrived" as a cancel too.
    //
    // The timer is disarmed the moment `change` reports a file, NOT once the file
    // has been read: a read slower than the delay (a large file, cold storage)
    // would otherwise resolve the cancel first and silently discard the import.
    const onFocus = () => {
      cancelTimer = setTimeout(() => finish(null), 500);
    };

    input.addEventListener('cancel', () => finish(null));
    input.addEventListener('change', () => {
      if (cancelTimer) clearTimeout(cancelTimer);
      cancelTimer = null;
      window.removeEventListener('focus', onFocus);

      const file = input.files?.[0];
      if (!file) return finish(null);
      file.text().then(finish, fail);
    });
    window.addEventListener('focus', onFocus);

    document.body.appendChild(input);
    input.click();
  });
}
