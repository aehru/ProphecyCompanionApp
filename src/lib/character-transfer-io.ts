// Device-side glue for character export / import: write the JSON to a file and
// open the share sheet, or pick a file and read it back. Kept apart from the
// pure `character-transfer` module (which stays Node-testable) because this
// touches expo-file-system / sharing / document-picker native modules.

import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { serializeExport, type ProphecyExport } from '@/lib/character-transfer';

/** YYYY-MM-DD for a human-readable export filename. */
function dateStamp(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Write an export to a cache file and open the OS share sheet (save to Files,
 * send to another device, etc.). No-op with a thrown error if sharing is
 * unavailable on the platform.
 */
export async function shareExport(exp: ProphecyExport): Promise<void> {
  const file = new File(Paths.cache, `prophecy-${dateStamp()}.json`);
  try {
    if (file.exists) file.delete();
  } catch {
    // stale temp — ignore
  }
  file.create();
  file.write(serializeExport(exp));

  if (!(await Sharing.isAvailableAsync())) {
    throw new Error("Le partage n'est pas disponible sur cet appareil.");
  }
  await Sharing.shareAsync(file.uri, {
    mimeType: 'application/json',
    dialogTitle: 'Exporter les personnages',
    UTI: 'public.json',
  });
}

/**
 * Open the document picker and read the chosen file's text. Returns null if the
 * user cancels. The raw string is handed to `parseImport` for validation.
 */
export async function pickImportText(): Promise<string | null> {
  const res = await DocumentPicker.getDocumentAsync({
    type: 'application/json',
    copyToCacheDirectory: true,
  });
  if (res.canceled || !res.assets?.[0]) return null;
  return await new File(res.assets[0].uri).text();
}
