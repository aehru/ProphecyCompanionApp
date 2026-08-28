import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { useEffect, useMemo, useState } from 'react';

import type { SpellPreset } from '@/data/spell-catalog';
import { planEntries, planSpellSync, type SpellSyncEntry, type SpellSyncPlan } from '@/lib/spell-sync';
import { catalogueSpellsQuery } from '@/repositories/spell-sync';

const EMPTY_PLAN: SpellSyncPlan = { auto: [], conflicts: [] };

export type SpellSyncPlanState = {
  plan: SpellSyncPlan;
  /** Everything the plan would write, conflicts last — what the screen lists. */
  entries: SpellSyncEntry[];
  /** charId → nom, so a row can say whose sheet it is about. */
  nameById: Map<number, string>;
  /** The catalogue or the rows are still coming. */
  loading: boolean;
};

/**
 * What a catalogue update would change across every character on the device —
 * assembled HERE and nowhere else, so the banner that offers the sweep and the
 * screen that performs it can never disagree about how much there is to do.
 *
 * `enabled` gates the one expensive part. Evaluating `spell-catalog.gen` costs
 * ~139ms (338 spells of rulebook prose), and the Catalogues tab deliberately
 * defers that to idle rather than paying it during a navigation — so it passes
 * its own `ready` here instead of letting the import fire on mount. The query is
 * unconditional: it is a single indexed read, and a hook cannot be skipped.
 */
export function useSpellSyncPlan(enabled = true): SpellSyncPlanState {
  const [catalog, setCatalog] = useState<readonly SpellPreset[] | null>(null);
  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    // Module-cached: whoever imports it first pays, everyone after is free.
    import('@/data/spell-catalog').then((m) => {
      if (alive) setCatalog(m.SPELL_CATALOG);
    });
    return () => {
      alive = false;
    };
  }, [enabled]);

  const { data: rows } = useLiveQuery(catalogueSpellsQuery(), []);

  const nameById = useMemo(() => {
    const map = new Map<number, string>();
    for (const r of rows ?? []) map.set(r.spell.characterId, r.characterNom);
    return map;
  }, [rows]);

  const plan = useMemo(() => {
    if (!catalog || !rows) return EMPTY_PLAN;
    return planSpellSync(
      rows.map((r) => r.spell),
      catalog,
    );
  }, [rows, catalog]);

  const entries = useMemo(() => planEntries(plan), [plan]);

  return { plan, entries, nameById, loading: !catalog || !rows };
}
