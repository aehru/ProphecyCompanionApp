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

import { CASTES, type CasteKey, GREAT_DRAGONS, type GreatDragonKey } from '@/constants/prophecy';
import { fold } from '@/lib/text-fold';

/** Key or label, accented or not, any case → key. Unknown/blank → null. */
function looseKey<K extends string>(list: readonly { key: K; label: string }[]) {
  const byFolded = new Map<string, K>();
  for (const e of list) {
    byFolded.set(fold(e.key), e.key);
    byFolded.set(fold(e.label), e.key);
  }
  return (input: unknown): K | null =>
    typeof input === 'string' ? (byFolded.get(fold(input.trim())) ?? null) : null;
}

/** Key, label, accented or not, any case → caste key. Unknown/blank → null. */
export const casteFromInput = looseKey<CasteKey>(CASTES);

/**
 * The same leniency for `characters.chosenBy`: « Brorne » or « brorne » → the
 * dragon key, anything else → null (« non Élu »).
 */
export const dragonFromInput = looseKey<GreatDragonKey>(GREAT_DRAGONS);
