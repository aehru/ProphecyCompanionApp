import { and, asc, eq, isNull } from 'drizzle-orm';

import { db } from '@/db/client';
import { effects, type Skill, skills } from '@/db/schema';
import { skillTarget } from '@/lib/modifiers';

/** Live query for a character's skills — base skills and specializations. */
export function skillsQuery(characterId: number) {
  return db.select().from(skills).where(eq(skills.characterId, characterId)).orderBy(asc(skills.name));
}

export type SkillInput = { name: string; attribut: string; value: number };

/** Canonical composite name for a specialization ("Herboristerie (Curative)"). */
export function specName(motherName: string, label: string): string {
  const l = label.trim();
  return l ? `${motherName} (${l})` : `${motherName} (…)`;
}

/**
 * Replace a character's **base** skills (specializations are managed live and
 * left untouched here). Only base skills with value > 0 are kept.
 *
 * Specializations are deliberately NOT pruned when their mother disappears: a GM
 * may allow a specialization without the base skill, so a mother-less spec simply
 * becomes standalone (shown under a "non acquise" ghost header) rather than being
 * deleted. Removing a spec is always an explicit action (deleteSpecialization).
 *
 * Runs in a sync transaction (see CLAUDE.md: an async tx callback commits early).
 */
export async function replaceSkills(characterId: number, rows: SkillInput[]) {
  const keep = rows
    .map((r) => ({ name: r.name.trim(), attribut: r.attribut, value: r.value }))
    .filter((r) => r.name !== '' && r.value > 0);

  await db.transaction((tx) => {
    // Base skills only — parentName IS NULL. Specialization rows are never wiped
    // by the base save, so live spec edits can't be clobbered by a flush.
    tx.delete(skills).where(and(eq(skills.characterId, characterId), isNull(skills.parentName))).run();
    if (keep.length > 0) {
      tx.insert(skills)
        .values(keep.map((r) => ({ characterId, name: r.name, attribut: r.attribut, value: r.value })))
        .run();
    }
  });
}

/**
 * Add a specialization of `mother`, seeded from the mother's current value and
 * sharing its attribut. Starts unlabeled; the editor fills in the short label.
 */
export async function createSpecialization(
  characterId: number,
  mother: { name: string; attribut: string; value: number },
) {
  const label = '';
  await db.insert(skills).values({
    characterId,
    name: specName(mother.name, label),
    attribut: mother.attribut,
    value: mother.value,
    parentName: mother.name,
    specLabel: label,
  });
}

/** Update a skill's value (used for specializations; base values flow through replaceSkills). */
export async function updateSkillValue(id: number, value: number) {
  await db.update(skills).set({ value }).where(eq(skills.id, id));
}

/**
 * Rename a specialization's label. Recomputes the canonical composite `name` and
 * rewrites any effect that targeted the old name, so bonus/malus stay attached.
 */
export async function renameSpecialization(spec: Skill, newLabel: string) {
  if (spec.parentName == null) return;
  const newName = specName(spec.parentName, newLabel);
  await db.transaction((tx) => {
    tx.update(skills).set({ specLabel: newLabel, name: newName }).where(eq(skills.id, spec.id)).run();
    if (newName !== spec.name) {
      tx
        .update(effects)
        .set({ target: skillTarget(newName) })
        .where(and(eq(effects.characterId, spec.characterId), eq(effects.target, skillTarget(spec.name))))
        .run();
    }
  });
}

/** Delete a specialization and any effect that targeted it. */
export async function deleteSpecialization(spec: Skill) {
  await db.transaction((tx) => {
    tx.delete(skills).where(eq(skills.id, spec.id)).run();
    tx
      .delete(effects)
      .where(and(eq(effects.characterId, spec.characterId), eq(effects.target, skillTarget(spec.name))))
      .run();
  });
}
