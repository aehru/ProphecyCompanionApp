// Loose caste lookup: anything a caste could plausibly be written as → the key
// stored in `characters.caste`, or null for « Sans Caste ».
//
// It exists because a caste arrives from more than one place: our own exports
// (already a key), a hand-edited backup file, an older export that predates the
// column, and the picker itself. Accepting only the exact key would turn
// « Érudit », « erudit » or « ÉRUDIT » into silent data loss on import, so the
// match goes through the app's one `fold` — the same leniency the catalogue
// generator and the search boxes already give.
//
// Anything unrecognized becomes null rather than throwing: a caste is a label,
// and losing it must never cost the user the rest of the character.
//
// Pure — no framework imports, like the other engines in lib/.

import { CASTES, type CasteKey } from '@/constants/prophecy';
import { fold } from '@/lib/text-fold';

const BY_FOLDED = new Map<string, CasteKey>();
for (const c of CASTES) {
  BY_FOLDED.set(fold(c.key), c.key);
  BY_FOLDED.set(fold(c.label), c.key);
}

/** Key, label, accented or not, any case → caste key. Unknown/blank → null. */
export function casteFromInput(input: unknown): CasteKey | null {
  if (typeof input !== 'string') return null;
  const q = fold(input.trim());
  if (q === '') return null;
  return BY_FOLDED.get(q) ?? null;
}
