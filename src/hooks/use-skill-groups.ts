import { useMemo } from 'react';

import { useAttrColors } from '@/components/campaign/roster-accents';
import type { Skill } from '@/db/schema';
import type { ModifierSource } from '@/lib/modifiers';
import { detachOrphanSpecs, groupSkills, type SkillGroup } from '@/lib/skill-groups';

/**
 * The read-only Compétences reading — one group per attribut, COMP · MOD · TOT
 * per row — through the SAME `groupSkills` the GM's Compagnie uses, so a player
 * and their GM can't drift apart.
 *
 * Shared by the attribut pages (no query) and the search results (query set),
 * which is why it is a hook rather than a component: the pager renders one group
 * per page, the overlay renders all of them.
 */
export function useSkillGroups({
  skills,
  attributs,
  effects,
  wound,
  query = '',
}: {
  skills: Skill[];
  /** Attribut values off the character sheet, keyed by column key. */
  attributs: Record<string, number>;
  effects: ModifierSource[];
  /** Current wound malus (non-positive) — it hits every roll. */
  wound: number;
  query?: string;
}): SkillGroup[] {
  const attrColors = useAttrColors();

  const shared = useMemo(() => detachOrphanSpecs(skills), [skills]);

  const q = query.trim().toLowerCase();
  return useMemo(
    () => groupSkills(shared, attributs, attrColors, q, effects, wound),
    [shared, attributs, attrColors, q, effects, wound],
  );
}
