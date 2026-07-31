// The accents the MD3 scale does not carry: one colour per attribut, reused for
// the tendance rings, plus the deterministic avatar palette.
//
// Design source: the `GM Campaign.dc.html` design project (parchment & gold).
// Everything else on these screens flows through useProphecyTheme().

import { useProphecyTheme } from '@/hooks/use-prophecy-theme';

/**
 * Per-attribut accent (Physique / Mental / Manuel / Social), keyed by the
 * attribut column key. The MD3 scale only carries secondary + tertiary, so the
 * dragon-brick and nature-green are literal here, split by scheme to stay
 * legible on both parchment and charcoal. Mirrors the design's ATTR_COLOR map.
 *
 * Module-level constants on purpose: the hooks below must return a STABLE
 * reference per scheme, because callers pass the map into useMemo deps (the
 * `groupSkills` memos in Compagnie / the GM sheet). A fresh object literal per
 * render would invalidate those memos on every render.
 */
const ATTR_COLORS_LIGHT: Record<string, string> = {
  physique: '#6C3A2C',
  mental: '#4F6475',
  manuel: '#A37B3F',
  social: '#5B7251',
};
const ATTR_COLORS_DARK: Record<string, string> = {
  physique: '#8C3E30',
  mental: '#6D8CA4',
  manuel: '#E1C37A',
  social: '#6E8C65',
};

// Reuse the attribut accents so the two screens read as one palette.
const TEND_COLORS_LIGHT: Record<string, string> = {
  dragon: ATTR_COLORS_LIGHT.physique,
  fatalite: ATTR_COLORS_LIGHT.mental,
  homme: ATTR_COLORS_LIGHT.social,
};
const TEND_COLORS_DARK: Record<string, string> = {
  dragon: ATTR_COLORS_DARK.physique,
  fatalite: ATTR_COLORS_DARK.mental,
  homme: ATTR_COLORS_DARK.social,
};

export function useAttrColors(): Record<string, string> {
  const theme = useProphecyTheme();
  return theme.dark ? ATTR_COLORS_DARK : ATTR_COLORS_LIGHT;
}

/** Tendance ring accents: Dragon → brick, Fatalité → slate, Homme → green. */
export function useTendColors(): Record<string, string> {
  const theme = useProphecyTheme();
  return theme.dark ? TEND_COLORS_DARK : TEND_COLORS_LIGHT;
}

// A small, fixed avatar palette (design assigns one accent per player). Picked
// deterministically from the name so a character keeps the same colour across
// sessions without any stored field. Values read fine on light and dark.
const AVATAR_ACCENTS = ['#5B7251', '#4F6475', '#A37B3F', '#6C3A2C', '#7A4D24', '#8C6A3F'];

export function playerAccent(nom: string): string {
  let h = 0;
  for (let i = 0; i < nom.length; i++) h = (h * 31 + nom.charCodeAt(i)) >>> 0;
  return AVATAR_ACCENTS[h % AVATAR_ACCENTS.length];
}

export function initials(nom: string): string {
  const parts = nom.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  return parts
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}
