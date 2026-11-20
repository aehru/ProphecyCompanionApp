import type { FormValues } from '@/lib/character-values';
import { CREATION_STEPS, type CreationBuild, EMPTY_BUILD } from '@/lib/creation';
import { EMPTY_SKILLS } from '@/lib/creation-skills';

/**
 * A guided creation left half-way: the form, the build and the step. The
 * portrait is NOT kept — the picker hands back a temporary uri (a blob URL on
 * web) that does not outlive the session.
 */
export type CreationDraft = { v: FormValues; build: CreationBuild; step: number; savedAt: number };

/**
 * A stored draft back, or null when there is none or it cannot be read. Fields
 * a newer build added are filled from the empty build, so an older draft
 * resumes rather than crashing a step.
 */
export function parseDraft(raw: string | null): CreationDraft | null {
  if (!raw) return null;
  try {
    const d = JSON.parse(raw) as Partial<CreationDraft>;
    if (!d || typeof d.v !== 'object' || typeof d.build !== 'object' || d.v === null || d.build === null)
      return null;
    const step = Number.isInteger(d.step) ? (d.step as number) : 0;
    return {
      v: d.v,
      build: { ...EMPTY_BUILD, ...d.build, skills: { ...EMPTY_SKILLS, ...d.build.skills } },
      step: Math.min(Math.max(step, 0), CREATION_STEPS.length - 1),
      savedAt: typeof d.savedAt === 'number' ? d.savedAt : 0,
    };
  } catch {
    return null;
  }
}

/** Nothing worth keeping yet: still on the first step with no age picked. */
export function isBlankDraft(build: CreationBuild, step: number): boolean {
  return step === 0 && build.age == null;
}
