import { type IconName } from '@/components/ui/icon';

/**
 * The glyphs an initiative die can be marked with — « which of these is the off
 * hand », « that one is the sortilège ».
 *
 * Drawn from the DS set (no emoji: they ignore the theme and render differently
 * per platform). The app attaches no rule to a mark: « la dague » is whatever
 * the player decided « la dague » is — which is why two blades and a hand sit
 * next to a moon.
 *
 * Ordered weapons first, since the case that prompted the feature is two-weapon
 * fighting: `hand` for main/off, then the blades, then the ranged pair, then the
 * open-ended marks. `sword` is diagonal and `sword2` vertical precisely so a
 * player can mark two different swords apart.
 *
 * Lives here rather than in `lib/` because it is typed by the icon set, and
 * `lib/` stays free of framework imports so it loads in plain-Node vitest.
 */
export const DIE_ICONS: readonly IconName[] = [
  'hand',
  'sword',
  'sword2',
  'dagger',
  'shield',
  'bow',
  'crossbow',
  'magic',
  'fire',
  'potion',
  'rune',
  'star',
  'moon',
];

/**
 * A stored key is only rendered if it is still one we know — the column holds
 * plain strings, and an app that drops a glyph from the list must not crash on
 * rows that were marked with it.
 */
export function asDieIcon(key: string | undefined): IconName | undefined {
  return key && (DIE_ICONS as readonly string[]).includes(key) ? (key as IconName) : undefined;
}
