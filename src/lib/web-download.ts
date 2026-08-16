// Handing a file to the user from a browser.
//
// Web-only glue: imported exclusively from `.web.ts` modules, never from the
// native graph. It exists so the one awkward detail below is written once rather
// than copied into every export path.

/** Save `blob` to the user's downloads under `filename`. */
export function downloadFile(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoked late rather than immediately: Safari needs the blob URL to outlive
  // the click that started the download.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
