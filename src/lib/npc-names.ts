/**
 * Invented names for generated PNJs.
 *
 * Syllables rather than a name list: a list of 200 names repeats visibly at a
 * table where a GM generates five gardes in a row, and a rulebook name list is
 * not ours to copy. Assembling from pools gives thousands of readable names for
 * a few dozen authored fragments.
 *
 * The pools are Prophecy-flavoured by ear, not extracted from the setting — they
 * are ours, like SPELL_TAGS. They live in TypeScript rather than a CSV because
 * they are prose fragments with no columns to validate; if authors ever want to
 * edit them, they move to `data-src/` like the catalogues did.
 *
 * Pure — the caller injects the `Rng`, so a seed replays the same name.
 */

import { nextNpcName } from '@/lib/npc-name';
import { chance, pick, type Rng } from '@/lib/rng';

const ONSETS = [
  'B', 'Br', 'D', 'Dr', 'F', 'G', 'Gr', 'H', 'K', 'Kh', 'L', 'M', 'N', 'R',
  'S', 'Sh', 'T', 'Th', 'V', 'Y', 'Z',
];

/** Vowels for the OPEN first syllable — diphthongs are allowed to sing there. */
const NUCLEI = ['a', 'ae', 'e', 'i', 'o', 'u', 'ia', 'ei', 'ou'];

/**
 * Vowels for the CLOSED last syllable — simple only. A diphthong in front of a
 * cluster gives « Diadaesk », which no one wants to read out at a table.
 */
const TAIL_NUCLEI = ['a', 'e', 'i', 'o', 'u'];

/** Middle syllables — kept open (no cluster) so two of them still read aloud. */
const LINKS = ['ra', 'ne', 'li', 'mo', 'da', 've', 'sa', 'to', 'ki', 'lu', 'na', 'ri'];

const CODAS = ['n', 'r', 'l', 's', 'th', 'nn', 'rn', 'sk', 'x', ''];

/** Places a name can be « de » — invented holds, valleys and cities. */
const ORIGINS = [
  'Kaandre', 'Vorlan', 'Trois-Ponts', 'Haute-Roche', 'Sombreval', 'Aldemar',
  'Fenmarche', 'Cavelune', 'Rivebrume', 'Pierrefonds',
];

/** Sobriquets a table hangs on a PNJ — always lowercase, always after the name. */
const EPITHETS = [
  'le Borgne', 'la Rousse', 'le Taciturne', 'le Boiteux', 'la Patiente',
  'le Cadet', "l'Ancien", 'la Vive', 'le Long', 'la Sage', 'le Balafré',
];

/** The consonant a fragment starts with, folded — used to refuse a stutter. */
const head = (s: string) => s[0]?.toLowerCase() ?? '';

/**
 * Pick a fragment that does not start with the same consonant as `previous`.
 * Two draws, then whatever came out: « Lulusous » is worth one retry, not a
 * loop, and a repeated consonant is only ugly — never wrong.
 */
function pickUnlike(rng: Rng, items: readonly string[], previous: string): string {
  let choice = pick(rng, items) ?? items[0];
  for (let i = 0; i < 2 && head(choice) === head(previous); i++) {
    choice = pick(rng, items) ?? items[0];
  }
  return choice;
}

/**
 * A bare given name — two syllables most of the time, three now and then, so a
 * roster reads varied without producing unpronounceable chains.
 */
export function generateGivenName(rng: Rng): string {
  const onset = pick(rng, ONSETS) ?? 'M';
  const first = onset + (pick(rng, NUCLEI) ?? 'a');
  const link = chance(rng, 0.35) ? pickUnlike(rng, LINKS, onset) : '';
  const tailOnset = pickUnlike(rng, ONSETS, link || onset).toLowerCase();
  const tail = tailOnset + (pick(rng, TAIL_NUCLEI) ?? 'a') + (pick(rng, CODAS) ?? '');
  return first + link + tail;
}

/**
 * A full PNJ name: a given name, plus — sometimes — an origin or a sobriquet.
 * Only one of the two, never both: « Doran de Vorlan le Borgne » is a title, not
 * a name a GM wants to say twice in a fight.
 */
export function generateNpcName(rng: Rng): string {
  const given = generateGivenName(rng);
  if (chance(rng, 0.25)) return `${given} de ${pick(rng, ORIGINS) ?? 'Kaandre'}`;
  if (chance(rng, 0.2)) return `${given} ${pick(rng, EPITHETS) ?? 'le Cadet'}`;
  return given;
}

/**
 * A name no one at the table already carries. Draws a handful of times, then
 * falls back to the numbering the spawn flow already uses (« Doran 2 ») rather
 * than looping forever — the pools are large, so the fallback is a safety net,
 * not the normal path.
 */
export function uniqueNpcName(rng: Rng, taken: readonly string[]): string {
  const used = new Set(taken.map((n) => n.trim().toLowerCase()));
  for (let i = 0; i < 12; i++) {
    const name = generateNpcName(rng);
    if (!used.has(name.toLowerCase())) return name;
  }
  return nextNpcName(generateNpcName(rng), taken);
}
