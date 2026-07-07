import type { NewSpell } from '@/db/schema';

/**
 * A pickable spell template. `data` is spread into `createSpell` (minus the
 * character link), so its keys mirror the `spells` table columns.
 *
 * PLACEHOLDER — a couple of sample spells to prove the picker flow. Replace with
 * the real Prophecy spell list; no migration needed to extend this array.
 */
export type SpellPreset = {
  /** Stable slug (used as list key). */
  id: string;
  data: Omit<NewSpell, 'characterId' | 'id'>;
};

export const SPELL_CATALOG: SpellPreset[] = [
  {
    id: 'bouclier-carmin',
    data: {
      name: 'Bouclier carmin',
      complexity: 15,
      discipline: 'magieInstinctive',
      sphere: 'sphereFeu',
      cost: 3,
      castTimeAmount: 2,
      castTimeUnit: 'action',
      difficulty: 15,
      cle: 'Morceau de charbon, chant du feu',
      effect: 'Pare une attaque. Disparait après (1 + NR) heures si non dissipé.',
    },
  },
  {
    id: 'file-vent',
    data: {
      name: 'File vent',
      complexity: 20,
      discipline: 'magieInstinctive',
      sphere: 'sphereVents',
      cost: 5,
      castTimeAmount: 1,
      castTimeUnit: 'action',
      difficulty: 15,
      cle: 'Rune de vitesse, mouvements très vifs et saccadés',
      effect: '-5 jets d\'esquive et +10 difficulté des attaques adverses. Pendant (1 + NR) tours.',
    },
  },
];
