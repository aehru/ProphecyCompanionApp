import type { CasteKey } from '@/constants/prophecy';

/**
 * The privilèges a character may pick: their caste's, with the Ordres Noirs
 * entries only once sworn. No caste ⇒ nothing (a privilège is bought FROM a
 * caste).
 */
export function privilegesFor<P extends { caste: CasteKey; darkOrders?: boolean }>(
  catalog: readonly P[],
  caste: string | null | undefined,
  darkOrders: boolean | null | undefined,
): P[] {
  if (!caste) return [];
  return catalog.filter((p) => p.caste === caste && (!p.darkOrders || !!darkOrders));
}

/**
 * A taken privilège the character no longer qualifies for — another caste, or
 * an Ordres Noirs entry after leaving the oath. Flagged, never removed: what was
 * bought stays bought, and the GM settles it.
 */
export function privilegeOffCaste(
  row: { caste: string; darkOrders: boolean },
  caste: string | null | undefined,
  darkOrders: boolean | null | undefined,
): boolean {
  return row.caste !== caste || (row.darkOrders && !darkOrders);
}
