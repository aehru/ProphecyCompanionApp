import type { IconName } from '@/components/ui/icon';
import type { TraitKind } from '@/constants/prophecy';

/**
 * Which glyph each half of the pool reads as: a star EARNS, a weight COSTS.
 *
 * In its own module, for the same reason `weapon-constants.ts` is: the
 * catalogue list needs it, and it used to live next to `<TraitRow>` — which
 * imports the repository, the DB client and `Alert`. That made the read-only
 * catalogue (the home « Catalogues » tab, a list with no character and nothing
 * to write) depend on the whole write path to draw two icons.
 */
export const TRAIT_ICON: Record<TraitKind, IconName> = {
  avantage: 'star',
  desavantage: 'weight',
};
