/**
 * The palette for anything drawn OVER A PHOTOGRAPH — the portrait hero's scrim
 * and name, the tendance rings in their overlay tone, the identity chips on top
 * of them.
 *
 * FIXED values, deliberately not theme roles, and the fourth such palette in the
 * app (with the tendance trio, the dragon accents and the campaign roster
 * accents — see CLAUDE.md). The reason is the same in every case: these sit on a
 * dark wash over arbitrary pixels, not on a surface. The light theme's
 * `secondary` (#A37B3F) is a mid brown that all but disappears there, and a
 * theme-driven ink would make the rings vanish on a pale portrait in one theme
 * and on a dark one in the other.
 *
 * One module because the values are shared: the ink was previously five
 * constants across four components, each documented by a comment pointing at
 * another file (« See CasteChip's OVERLAY_GOLD », « like the tendance trio's own
 * colours ») — the gold and the muted text were each written out twice, and the
 * scrim twice in two different notations.
 */
export const OVERLAY_INK = {
  /** The DS gold, lightened for a scrim — the caste and Statut chips. */
  gold: '#E1C37A',
  /** Primary ink: a character's name, a tendance ring's value. */
  text: '#F8F2E8',
  /** Secondary ink: a free-text chip, which must not shout over the name. */
  textMuted: '#E8E4D6',
  /** Hairline for a chip that carries no colour of its own. */
  border: 'rgba(232,228,214,0.55)',
  /** The wash itself, as the portrait's gradient stops take it. */
  scrim: '#141618',
  /**
   * The same wash at 55%, pre-composited for the tendance rings' discs. Spelled
   * out rather than derived from `scrim`: an 8-digit hex would round 0.55 to
   * 140/255, and the two are meant to be the same colour exactly.
   */
  scrimDisc: 'rgba(20,22,24,0.55)',
} as const;
