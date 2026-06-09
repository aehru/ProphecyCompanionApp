import { DEFAULT_SKILLS, NUMERIC_KEYS } from '@/constants/prophecy';
import type { Character, NewCharacter, Skill } from '@/db/schema';
import type { SkillInput } from '@/repositories/skills';

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

/** One editable skill line in the form. `value` is a string (blank = 0 = not owned). */
export type SkillRow = { name: string; attribut: string; value: string; isCustom: boolean };

/**
 * Merge the saved skills onto the default catalogue for editing:
 * every default skill is shown (value blank when not owned), and any custom
 * (free) skill the character has is appended.
 */
export function buildSkillRows(dbSkills: Skill[]): SkillRow[] {
  const byName = new Map(dbSkills.map((s) => [s.name, s]));
  const rows: SkillRow[] = DEFAULT_SKILLS.map((d) => {
    const saved = byName.get(d.name);
    return {
      name: d.name,
      attribut: saved?.attribut ?? d.attribut,
      value: saved ? String(saved.value) : '',
      isCustom: false,
    };
  });
  const defaultNames = new Set(DEFAULT_SKILLS.map((d) => d.name));
  for (const s of dbSkills) {
    if (!defaultNames.has(s.name)) {
      rows.push({ name: s.name, attribut: s.attribut, value: String(s.value), isCustom: true });
    }
  }
  return rows;
}

/** Editable skill lines → repository input (blank value becomes 0; repo drops 0s). */
export function skillRowsToInput(rows: SkillRow[]): SkillInput[] {
  return rows.map((r) => {
    let n = parseInt(r.value, 10);
    if (!Number.isFinite(n)) n = 0;
    return { name: r.name.trim(), attribut: r.attribut, value: n };
  });
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
