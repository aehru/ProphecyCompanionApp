/**
 * Expérience — the arithmetic around the two stored counters
 * (`actual_state.xpTotal` / `xpSpent`).
 *
 * Only the two counters are stored; the disponible is derived here and nowhere
 * else, because a third stored number would be one more thing to keep in step.
 *
 * The disponible MAY be negative, and that is not an error state: the app has
 * no rulebook cost table (spending is typed in by hand), so a player who has
 * agreed a purchase with the GM records it whatever the balance says. Callers
 * clamp the two COUNTERS at zero — neither an award nor a spend can be
 * negative — and leave the difference alone.
 */

/** Unspent XP. Negative when more has been spent than earned (allowed). */
export const xpAvailable = (total: number, spent: number) => total - spent;
