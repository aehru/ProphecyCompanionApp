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
// The same grammar reads the « Maison » manœuvres a table types in the app
// (`custom_manoeuvres`), where a refused cell is KEPT and printed as typed —
// the editor warns, it does not block.
//
// Pure — no framework imports and no catalogue import, so the generator can
// load it without loading a file it generates.

import { MANOEUVRE_RATINGS, type ManoeuvreRatingKey } from '@/constants/prophecy';
import type { ManoeuvrePreset } from '@/data/manoeuvre-catalog';
import type { CustomManoeuvre, NewCustomManoeuvre } from '@/db/schema';
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
  /**
   * A « Maison » cell the grammar refused (or left blank), printed as written.
   * Never produced by the build, which refuses such a cell outright.
   */
  text?: string;
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
  if (r.text !== undefined) return r.text;
  const value = r.value === undefined ? '' : `${r.value}${r.plusX ? ' + X' : ''}`;
  if (!r.key) return r.note ? `${value}, ${r.note}` : value;
  if (r.key === 'selon') return `Selon ${r.note}`;
  const label = RATING.get(r.key)!.label;
  const base = value ? `${label} (${value})` : label;
  return r.note ? `${base}, ${r.note}` : base;
}

/** Row subtitle form — the number when there is one: « 15 », « 15+X », « Impossible ». */
export function ratingShort(r: ManoeuvreRating): string {
  if (r.text !== undefined) return r.text;
  if (r.value !== undefined) return `${r.value}${r.plusX ? '+X' : ''}`;
  return r.key === 'selon' ? `Selon ${r.note}` : RATING.get(r.key!)!.label;
}

/** The catalogue row's one line: « Diff. 20 · Esq. 15 · Par. Selon l'arme », or « Règle ». */
export function manoeuvreSubtitle(stats: ManoeuvrePreset['stats']): string {
  if (!stats) return 'Règle';
  return `Diff. ${ratingShort(stats.difficulty)} · Esq. ${ratingShort(stats.dodge)} · Par. ${ratingShort(stats.parry)}`;
}

/** A rating back into a cell `parseRating` reads to the same thing — for a variant's editor. */
export function ratingCell(r: ManoeuvreRating): string {
  if (r.text !== undefined) return r.text;
  if (!r.key) {
    const n = `${r.value}${r.plusX ? ' + X' : ''}`;
    return r.note ? `${n} (${r.note})` : n;
  }
  if (r.key === 'selon') return `selon ${r.note}`;
  const word = RATING.get(r.key)!.label.toLowerCase();
  // Bracketed, the way the rulebook prints « normale (inutile) ».
  return r.note ? `${word} (${r.note})` : word;
}

/** What the editor shows under a rating field: null when the cell reads (or is blank). */
export function ratingWarning(raw: string): string | null {
  if (raw.trim() === '') return null;
  const r = parseRating(raw);
  return typeof r === 'string' ? r : null;
}

const cellRating = (raw: string): ManoeuvreRating => {
  const r = raw.trim() === '' ? '—' : parseRating(raw);
  return typeof r === 'string' ? { text: raw.trim() || '—' } : r;
};

/**
 * A « Maison » row read as a catalogue entry, so the list, the favourites and
 * the detail render it with no case of their own. The stat block exists as soon
 * as ONE of its four cells is filled — unlike the rulebook's all-or-nothing,
 * a table may well settle only the difficulté.
 */
export function customManoeuvrePreset(row: CustomManoeuvre): ManoeuvrePreset {
  const cells = [row.difficulty, row.dodge, row.parry, row.damage];
  const hasStats = cells.some((c) => c.trim() !== '');
  return {
    id: row.id,
    contexte: row.context,
    famille: row.family,
    nom: row.name.trim() || 'Sans nom',
    ...(hasStats && {
      stats: {
        difficulty: cellRating(row.difficulty),
        dodge: cellRating(row.dodge),
        parry: cellRating(row.parry),
        damage: row.damage.trim() || '—',
      },
    }),
    ...(row.roll.trim() && { roll: row.roll.trim() }),
    ...(row.inGameEffect.trim() && { inGameEffect: row.inGameEffect.trim() }),
    description: row.description,
    custom: true,
  };
}

/** A rulebook entry as the starting point of a « Maison » variant. */
export function variantOf(p: ManoeuvrePreset): NewCustomManoeuvre {
  return {
    context: p.contexte,
    family: p.famille,
    name: p.nom,
    difficulty: p.stats ? ratingCell(p.stats.difficulty) : '',
    dodge: p.stats ? ratingCell(p.stats.dodge) : '',
    parry: p.stats ? ratingCell(p.stats.parry) : '',
    damage: p.stats?.damage ?? '',
    roll: p.roll ?? '',
    inGameEffect: p.inGameEffect ?? '',
    description: p.description,
    presetId: p.id,
  };
}
