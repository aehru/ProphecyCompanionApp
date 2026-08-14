import { type IconName } from '@/components/ui/icon';

/**
 * The glyphs an initiative die can be marked with — « which of these is the off
 * hand », « that one is the sortilège ».
 *
 * Drawn from the DS set (no emoji: they ignore the theme and render differently
 * per platform), and deliberately a SHORT list — a mark is a memo for the next
 * two minutes of a fight, not a taxonomy. The app attaches no rule to one:
 * « la dague » is whatever the player decided « la dague » is.
 *
 * Lives here rather than in `lib/` because it is typed by the icon set, and
 * `lib/` stays free of framework imports so it loads in plain-Node vitest.
 */
export const DIE_ICONS: readonly IconName[] = [
  'sword',
  'shield',
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
