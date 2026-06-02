import { NUMERIC_KEYS } from '@/constants/prophecy';
import type { Character, NewCharacter } from '@/db/schema';

export type FormValues = Record<string, string>;

/** Read an object's fields by string key as numbers (one place for the unsafe cast). */
export function asNumRecord(obj: unknown): Record<string, number> {
  return (obj ?? {}) as Record<string, number>;
}

/** Read-view display: numbers (0/empty → dash), text (blank → dash). */
export const num = (x?: number) => (x && x > 0 ? String(x) : '—');
export const txt = (s?: string) => (s && s.trim() ? s.trim() : '—');

/** Clamp n to a lower bound, and an optional upper bound (max <= 0 means uncapped). */
export const clamp = (n: number, min: number, max?: number) => {
  let v = n < min ? min : n;
  if (max != null && max > 0 && v > max) v = max;
  return v;
};

/** Character row → editable string values for the form. */
export function toFormValues(c?: Partial<Character> | null): FormValues {
  const src = (c ?? {}) as Record<string, unknown>;
  const v: FormValues = {
    nom: (src.nom as string) ?? '',
    concept: (src.concept as string) ?? '',
    biographie: (src.biographie as string) ?? '',
  };
  for (const k of NUMERIC_KEYS) v[k] = src[k] != null ? String(src[k]) : '';
  return v;
}

/** Form values → character patch (blank numerics become 0). */
export function fromFormValues(v: FormValues): Partial<NewCharacter> {
  const out: Record<string, unknown> = {
    nom: v.nom.trim(),
    concept: v.concept.trim(),
    biographie: v.biographie.trim(),
  };
  for (const k of NUMERIC_KEYS) {
    let n = parseInt(v[k], 10);
    if (!Number.isFinite(n)) n = 0;
    // Tendance puces are capped at 10 (matches the DB CHECK constraint).
    if (k.endsWith('Sub')) n = Math.min(10, Math.max(0, n));
    out[k] = n;
  }
  return out as Partial<NewCharacter>;
}
