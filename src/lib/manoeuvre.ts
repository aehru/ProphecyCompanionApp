// A combat manœuvre's Difficulté / Esquive / Parade cells — one grammar for all
// three, parsed at build time by the catalogue generator and printed here.
//
//   cell := number [ "+ X" ] [ "(" note ")" ]
//         | keyword [ rest ] [ "(" number | note ")" ]
//
// « normale (15) », « normale », « 15 + X », « selon l'arme », « opposition si
// possible », « normale (inutile) ». The graded keywords carry their implied
// value (MANOEUVRE_RATINGS), so « normale » alone still reads 15 — and an
// explicit « normale (20) » is a typo the build refuses.
//
// Pure — no framework imports and no catalogue import, so the generator can
// load it without loading a file it generates.

import { MANOEUVRE_RATINGS, type ManoeuvreRatingKey } from '@/constants/prophecy';
import type { ManoeuvrePreset } from '@/data/manoeuvre-catalog';
import { fold } from '@/lib/text-fold';

export type ManoeuvreRating = {
  /** Absent for a bare number (« 20 », « 15 + X »). */
  key?: ManoeuvreRatingKey;
  /** The difficulté, when the cell has one — given or implied by `key`. */
  value?: number;
  /** « 15 + X »: the attacker picks X (Attaque précise). */
  plusX?: true;
  /** What qualifies the word: « l'arme » after `selon`, « si possible », « inutile ». */
  note?: string;
};

const RATING = new Map<string, (typeof MANOEUVRE_RATINGS)[number]>(
  MANOEUVRE_RATINGS.map((r) => [r.key, r]),
);

// Longest spelling first, so « non applicable » is not read as « non » + rest.
const SPELLINGS = MANOEUVRE_RATINGS.flatMap((r) =>
  [r.label, r.key.replace(/-/g, ' '), ...('aliases' in r ? r.aliases : [])].map(
    (sp) => [fold(sp), r] as const,
  ),
).sort((a, b) => b[0].length - a[0].length);

/** Parse one cell. A string result is the error message. */
export function parseRating(raw: string): ManoeuvreRating | string {
  let s = raw.normalize('NFC').trim();
  if (s === '') return 'vide';

  let explicit: number | undefined;
  let parenNote: string | undefined;
  const paren = /^(.*?)\s*\(([^)]*)\)$/.exec(s);
  if (paren) {
    s = paren[1];
    const inner = paren[2].trim();
    if (/^\d+$/.test(inner)) explicit = Number(inner);
    else if (inner !== '') parenNote = inner;
  }

  const num = /^(\d+)(\s*\+\s*X)?$/i.exec(s);
  if (num) {
    if (explicit !== undefined) return `« ${raw} » : deux nombres`;
    return {
      value: Number(num[1]),
      ...(num[2] && { plusX: true as const }),
      ...(parenNote && { note: parenNote }),
    };
  }

  // fold() keeps the length of NFC text (one mark stripped per accented
  // letter), so the matched prefix slices the original string cleanly.
  const f = fold(s);
  const hit = SPELLINGS.find(([sp]) => f === sp || f.startsWith(sp + ' '));
  if (!hit) {
    const valid = MANOEUVRE_RATINGS.map((r) => r.label.toLowerCase()).join(', ');
    return `« ${raw} » inconnu (un nombre, « 15 + X », ou : ${valid})`;
  }
  const [spelling, rating] = hit;
  const rest = s.slice(spelling.length).trim();
  if (rating.key === 'selon' && rest === '') return `« ${raw} » : selon quoi ?`;

  const implied = 'value' in rating ? rating.value : undefined;
  if (explicit !== undefined && implied === undefined) {
    return `« ${raw} » : « ${rating.label} » ne prend pas de nombre`;
  }
  if (explicit !== undefined && explicit !== implied) {
    return `« ${raw} » : « ${rating.label} » vaut ${implied}, pas ${explicit}`;
  }
  const note = [rest, parenNote].filter(Boolean).join(', ');
  return {
    key: rating.key,
    ...(implied !== undefined && { value: implied }),
    ...(note && { note }),
  };
}

/** Full reading: « Normale (15) », « Selon l'arme », « Opposition, si possible ». */
export function ratingLabel(r: ManoeuvreRating): string {
  const value = r.value === undefined ? '' : `${r.value}${r.plusX ? ' + X' : ''}`;
  if (!r.key) return r.note ? `${value}, ${r.note}` : value;
  if (r.key === 'selon') return `Selon ${r.note}`;
  const label = RATING.get(r.key)!.label;
  const base = value ? `${label} (${value})` : label;
  return r.note ? `${base}, ${r.note}` : base;
}

/** Row subtitle form — the number when there is one: « 15 », « 15+X », « Impossible ». */
export function ratingShort(r: ManoeuvreRating): string {
  if (r.value !== undefined) return `${r.value}${r.plusX ? '+X' : ''}`;
  return r.key === 'selon' ? `Selon ${r.note}` : RATING.get(r.key!)!.label;
}

/** The catalogue row's one line: « Diff. 20 · Esq. 15 · Par. Selon l'arme », or « Règle ». */
export function manoeuvreSubtitle(stats: ManoeuvrePreset['stats']): string {
  if (!stats) return 'Règle';
  return `Diff. ${ratingShort(stats.difficulty)} · Esq. ${ratingShort(stats.dodge)} · Par. ${ratingShort(stats.parry)}`;
}
