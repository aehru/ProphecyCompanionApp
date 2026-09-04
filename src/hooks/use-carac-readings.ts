// The character-aware readings a piece of gear needs to be displayed: the raw
// caractéristique values, the modifier that hits them (wound + effects), and the
// compétence a weapon resolves to. Assembled once here so the catalogue previews
// show the exact numbers the Fiche shows — the arithmetic itself stays in
// lib/modifiers and lib/weapon-skill.
//
// The Inventaire tab composes the same pieces inline instead of calling this: it
// already holds those rows for its own editing (money, enchants, equip), and
// subscribing twice to the same tables would be waste, not safety.

import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { useMemo } from 'react';

import { asNumRecord } from '@/lib/character-values';
import { totalModifier, woundMalus } from '@/lib/modifiers';
import { weaponSkillReading, type WeaponSkillReading } from '@/lib/weapon-skill';
import { actualStateQuery } from '@/repositories/actual-state';
import { characterQuery } from '@/repositories/characters';
import { effectsQuery } from '@/repositories/effects';
import { skillsQuery } from '@/repositories/skills';

export interface CaracReadings {
  /** A caractéristique's value on the sheet (0 when unknown). */
  caracValue: (caracKey: string) => number;
  /** Wound malus + active effects for that caractéristique (signed, often 0). */
  caracModifier: (caracKey: string) => number;
  /** A weapon's compétence resolved against this character. */
  skillReading: (skillName: string | null | undefined) => WeaponSkillReading;
}

/**
 * Readings for `characterId`'s gear. Reactive: a stat edit, a new wound or an
 * expiring effect all re-render whatever reads them.
 */
export function useCaracReadings(characterId: number): CaracReadings {
  const { data: charRows } = useLiveQuery(characterQuery(characterId), [characterId]);
  const { data: stateRows } = useLiveQuery(actualStateQuery(characterId), [characterId]);
  const { data: effects } = useLiveQuery(effectsQuery(characterId), [characterId]);
  const { data: skills } = useLiveQuery(skillsQuery(characterId), [characterId]);

  // Memoized down to the query rows, and the returned object with them — the
  // same rule `useSpellTotal` follows, for the same reason: the weapon/armour/
  // shield catalogues call `skillReading` and `caracValue` once PER ROW, so a
  // freshly built trio of closures per render re-scans every skill list and
  // re-parses every prérequis formula on every keystroke of the search box.
  return useMemo(() => {
    const rec = asNumRecord(charRows?.[0] ?? {});
    const wound = woundMalus(asNumRecord(stateRows?.[0] ?? {}));
    const effectList = effects ?? [];
    const skillList = skills ?? [];
    return {
      caracValue: (k: string) => rec[k] ?? 0,
      caracModifier: (k: string) => totalModifier(k, effectList, wound),
      skillReading: (name: string | null | undefined) =>
        weaponSkillReading(name, skillList, rec, effectList, wound),
    };
  }, [charRows, stateRows, effects, skills]);
}
