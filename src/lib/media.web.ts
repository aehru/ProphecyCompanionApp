// Web counterpart to ./media.
//
// On native a character illustration is a FILE under the document dir and the DB
// stores a relative path. A browser has neither that directory nor a synchronous
// way to read one back — and `mediaUri` is called during render (character rows,
// the dashboard), while OPFS is async-only.
//
// So on web the stored "path" IS the image: a downscaled JPEG data URL, kept in
// the same column and handed straight to <Image>. Self-contained, synchronous to
// resolve, deleted with the row, and nothing left behind to garbage-collect.
//
// The two representations can never meet: the export envelope drops
// avatar/portrait entirely (they are absent from `characterSchema` in
// character-transfer), so a native install cannot receive a data URL and a web
// install cannot receive a file path.
//
// The cost is bytes in the row, which is why the image is cropped and downscaled
// here rather than stored as picked — a phone photo would otherwise land in
// SQLite at several megabytes.

export type MediaSlot = 'avatar' | 'portrait';

/** Longest edge kept per slot: sharp on a retina card, small enough for a row. */
const MAX_EDGE: Record<MediaSlot, number> = { avatar: 512, portrait: 768 };

/** Target width / height — mirrors native's `aspect` ([1,1] and [3,4]). */
const ASPECT: Record<MediaSlot, number> = { avatar: 1, portrait: 3 / 4 };

const QUALITY = 0.8;

/**
 * Resolve a stored value to something renderable. Anything that is not a data
 * URL is a native file path that has no meaning here, so it renders as nothing
 * rather than as a broken image.
 */
export function mediaUri(stored?: string | null): string | null {
  if (!stored) return null;
  return stored.startsWith('data:') ? stored : null;
}

/** Open a file picker and hand back the chosen image, or null if cancelled. */
function pickImageFile(): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.style.display = 'none';

    let done = false;
    const finish = (file: File | null) => {
      if (done) return;
      done = true;
      window.removeEventListener('focus', onFocus);
      input.remove();
      resolve(file);
    };
    // Same cancel handling as character-transfer-io.web: `cancel` is not emitted
    // everywhere, and a promise that never settles would hang the caller.
    const onFocus = () => setTimeout(() => finish(null), 500);

    input.addEventListener('cancel', () => finish(null));
    input.addEventListener('change', () => finish(input.files?.[0] ?? null));
    window.addEventListener('focus', onFocus);

    document.body.appendChild(input);
    input.click();
  });
}

/** Decode a file into an image element, cleaning up the object URL either way. */
async function loadImage(file: File): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Pick an image, centre-crop it to the slot's aspect ratio, downscale it and
 * return it as a JPEG data URL. Returns null if the user cancels.
 *
 * Native offers an interactive crop (`allowsEditing`); the browser has no such
 * dialog, so a centre crop stands in — for a head or a portrait it is almost
 * always the intended framing.
 */
export async function pickCharacterMedia(
  _id: number,
  slot: MediaSlot,
): Promise<string | null> {
  const file = await pickImageFile();
  if (!file) return null;

  const img = await loadImage(file);
  const aspect = ASPECT[slot];

  // Largest rectangle of the requested aspect that fits inside the source.
  let cropW = img.naturalWidth;
  let cropH = cropW / aspect;
  if (cropH > img.naturalHeight) {
    cropH = img.naturalHeight;
    cropW = cropH * aspect;
  }
  const cropX = (img.naturalWidth - cropW) / 2;
  const cropY = (img.naturalHeight - cropH) / 2;

  // Never upscale: a small source stays its own size.
  const scale = Math.min(1, MAX_EDGE[slot] / Math.max(cropW, cropH));
  const outW = Math.max(1, Math.round(cropW * scale));
  const outH = Math.max(1, Math.round(cropH * scale));

  const canvas = document.createElement('canvas');
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, outW, outH);

  // JPEG, not PNG: a photo as PNG would be several times larger in the row.
  return canvas.toDataURL('image/jpeg', QUALITY);
}

/**
 * "Copy" for duplication. The value is the image, so the copy is the same
 * string — there is no second file to write.
 */
export function copyMedia(stored: string | null | undefined, _toId: number): string | null {
  return stored && stored.startsWith('data:') ? stored : null;
}

/** No-op: the image lives in the row and goes when the row goes. */
export function deleteMedia(_stored?: string | null): void {}

/** No-op: see deleteMedia. */
export function deleteCharacterMedia(_id: number): void {}
