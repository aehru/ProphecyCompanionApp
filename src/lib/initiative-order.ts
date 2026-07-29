import { woundMalus } from '@/lib/modifiers';

/**
 * Turn a GM roster into a Prophecy initiative order.
 *
 * A character rolls N dice and acts once per die, each on its own count — so
 * the order is one row PER DIE, not per character: three dice means three
 * appearances. Pure and DB/React-free so the ranking rules stay testable.
 */

/** Just enough of the shared projection to rank it. */
export type InitiativeInput = {
  charId: string;
  nom: string;
  online: boolean;
  owner?: string;
  /** Projection shape: `{ [woundKey]: { current, max } }`. */
  wounds?: Record<string, { current?: number; max?: number }> | null;
  initiative?: { max?: number; values?: number[] } | null;
};

export type InitiativeRow = {
  charId: string;
  nom: string;
  online: boolean;
  owner?: string;
  /** 0-based die index, so the UI can label it "Dé 2". */
  dieIndex: number;
  /** The number rolled, shown as-is. */
  raw: number;
  /** Non-positive wound malus applied to every roll. */
  malus: number;
  /** raw + malus — what the die is actually worth, and what we sort on. */
  effective: number;
  /** Driven to 0 or below: the action is lost. Ranked last, flagged in the UI. */
  unusable: boolean;
};

/**
 * The wound malus is stored per level as filled boxes; the projection ships
 * `{ key: { current } }` while `woundMalus` wants `${key}Current`.
 */
export function sharedWoundMalus(
  wounds: InitiativeInput['wounds'],
): number {
  return woundMalus(
    Object.fromEntries(
      Object.entries(wounds ?? {}).map(([k, pool]) => [`${k}Current`, pool?.current ?? 0]),
    ),
  );
}

/**
 * Rows ranked by effective value, highest first; unusable dice sink below every
 * usable one. Ties break by name then die index, so the order is stable across
 * the roster pushes that stream in during play.
 *
 * `unrolled` is everyone who hasn't rolled yet — a GM waiting on them wants
 * that visible rather than silently absent.
 */
export function initiativeOrder(entries: readonly InitiativeInput[]): {
  rows: InitiativeRow[];
  unrolled: InitiativeInput[];
} {
  const rows: InitiativeRow[] = [];
  const unrolled: InitiativeInput[] = [];

  for (const e of entries) {
    const values = e.initiative?.values ?? [];
    if (values.length === 0) {
      unrolled.push(e);
      continue;
    }
    const malus = sharedWoundMalus(e.wounds);
    values.forEach((raw, dieIndex) => {
      const effective = raw + malus;
      rows.push({
        charId: e.charId,
        nom: e.nom,
        online: e.online,
        owner: e.owner,
        dieIndex,
        raw,
        malus,
        effective,
        unusable: effective <= 0,
      });
    });
  }

  rows.sort(
    (a, b) =>
      Number(a.unusable) - Number(b.unusable) ||
      b.effective - a.effective ||
      a.nom.localeCompare(b.nom) ||
      a.dieIndex - b.dieIndex,
  );
  unrolled.sort((a, b) => a.nom.localeCompare(b.nom));

  return { rows, unrolled };
}
