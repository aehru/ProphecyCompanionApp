/**
 * Numbering for spawned PNJs: three identical guards should read "Garde",
 * "Garde 2", "Garde 3" — not the "(copie)" / "(copie) (copie)" chain that
 * generic character duplication produces.
 *
 * Pure so it can be unit-tested; the repository does the DB half.
 */

/** "Garde 2" → stem "Garde", number 2. Anything else has no trailing number. */
const NUMBERED = /^(.*?)\s+(\d+)$/;

/** The name without its trailing number, so "Garde 3" and "Garde" share a stem. */
export function npcStem(name: string): string {
  const trimmed = name.trim();
  const m = NUMBERED.exec(trimmed);
  return (m ? m[1] : trimmed).trim();
}

/**
 * Next free name in `source`'s series. `existing` is every character name in
 * the DB; `source` is counted too, so the first copy of a lone "Garde" is
 * "Garde 2" whether or not the caller remembered to include it.
 *
 * Names outside the series are ignored, and gaps are not reused — numbering
 * follows the highest taken, so deleting "Garde 2" still yields "Garde 4".
 */
export function nextNpcName(source: string, existing: readonly string[]): string {
  const stem = npcStem(source) || 'PNJ';
  let highest = 0;
  for (const raw of [source, ...existing]) {
    const name = raw.trim();
    if (name === stem) {
      highest = Math.max(highest, 1);
      continue;
    }
    const m = NUMBERED.exec(name);
    if (m && m[1].trim() === stem) highest = Math.max(highest, Number(m[2]));
  }
  return `${stem} ${highest + 1}`;
}
