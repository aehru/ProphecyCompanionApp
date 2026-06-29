import { Directory, File, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';

/**
 * Character illustrations (avatar head + full portrait).
 *
 * Files live under `<Paths.document>/media/characters/<id>/` and the DB stores
 * the *relative* path (e.g. `media/characters/5/avatar-1781300000000.jpg`).
 * Relative so it survives the document dir changing across reinstalls — resolve
 * to a `file://` uri with `mediaUri` at display. The per-character folder + the
 * `media/` root keep everything in one place so a future export can zip the DB
 * and `media/` together.
 *
 * Filenames carry a timestamp (not a fixed `avatar.jpg`) to bust expo-image's
 * cache when a slot is replaced — the old file is deleted by the repository.
 */

export type MediaSlot = 'avatar' | 'portrait';

const MEDIA_ROOT = ['media', 'characters'];

function characterDir(id: number) {
  return new Directory(Paths.document, ...MEDIA_ROOT, String(id));
}

/** Resolve a stored relative path to a `file://` uri, or null if missing. */
export function mediaUri(relativePath?: string | null): string | null {
  if (!relativePath) return null;
  try {
    // Build the file:// uri without a filesystem stat — this runs in render
    // (character list rows, dashboard). A path is only stored right after we
    // write the file; a missing file is a rare edge expo-image renders empty.
    return new File(Paths.document, ...relativePath.split('/')).uri;
  } catch {
    return null;
  }
}

/**
 * Pick an image from the gallery, crop it (square for avatar, 3:4 for portrait),
 * copy it into the character's media folder, and return the new relative path.
 * Returns null if the user cancels or denies the permission.
 */
export async function pickCharacterMedia(id: number, slot: MediaSlot): Promise<string | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    Alert.alert('Permission requise', "Autorisez l'accès aux photos pour ajouter une image.");
    return null;
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: 'images',
    allowsEditing: true,
    aspect: slot === 'avatar' ? [1, 1] : [3, 4],
    quality: 0.8,
  });
  if (result.canceled || !result.assets?.[0]) return null;

  const asset = result.assets[0];
  const ext = (asset.uri.split('.').pop() || 'jpg').split('?')[0].toLowerCase();
  const dir = characterDir(id);
  dir.create({ intermediates: true, idempotent: true });
  const dest = new File(dir, `${slot}-${Date.now()}.${ext}`);
  new File(asset.uri).copy(dest);

  return [...MEDIA_ROOT, String(id), dest.name].join('/');
}

/** Delete a single media file by its stored relative path. No-op if missing. */
export function deleteMedia(relativePath?: string | null) {
  if (!relativePath) return;
  try {
    const file = new File(Paths.document, ...relativePath.split('/'));
    if (file.exists) file.delete();
  } catch {
    // already gone — ignore
  }
}

/** Delete every media file for a character (called when the character is deleted). */
export function deleteCharacterMedia(id: number) {
  try {
    const dir = characterDir(id);
    if (dir.exists) dir.delete();
  } catch {
    // already gone — ignore
  }
}
