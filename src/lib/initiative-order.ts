import { isLostDie, type DieUsage, type DieUse } from '@/lib/action-cumul';
import { woundMalus, type ModifierSource } from '@/lib/modifiers';

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
  initiative?: { max?: number; values?: number[]; usage?: DieUsage[] } | null;
  /** Active effects, for a wound-malus suspension. */
  effects?: readonly ModifierSource[];
};

export type InitiativeRow = {
  charId: string;
  nom: string;
  online: boolean;
  owner?: string;
  /** 0-based die index, so the UI can label it "Dé 2". */
  dieIndex: number;
  /**
   * How many dice this character rolled in total, so a row can read "Dé 2/3".
   * The ranking scatters one character's dice down the list, so the index alone
   * doesn't say how many actions they still have coming — the denominator does.
   * Counts every rolled die, unusable ones included: those are flagged on their
   * own row rather than silently dropped from the total.
   */
  dieCount: number;
  /** The number rolled, shown as-is. */
  raw: number;
  /** Non-positive wound malus applied to every roll. */
  malus: number;
  /** raw + malus — what the die is actually worth, and what we sort on. */
  effective: number;
  /** Driven to 0 or below while unused: the action is lost. Ranked last. */
  unusable: boolean;
  /** What the die was spent on this turn; null while it is still to play. */
  used: DieUse | null;
  /**
   * The value the row is RANKED on: `effective` while unused, frozen at the
   * value it was spent at once used — so a wound taken after acting can't drag
   * a played die back down the order.
   */
  rankValue: number;
};

/**
 * The wound malus is stored per level as filled boxes; the projection ships
 * `{ key: { current } }` while `woundMalus` wants `${key}Current`.
 */
export function sharedWoundMalus(
  wounds: InitiativeInput['wounds'],
  effects: readonly ModifierSource[] = [],
): number {
  return woundMalus(
    Object.fromEntries(
      Object.entries(wounds ?? {}).map(([k, pool]) => [`${k}Current`, pool?.current ?? 0]),
    ),
    effects,
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
  currentCount: number | null;
} {
  const rows: InitiativeRow[] = [];
  const unrolled: InitiativeInput[] = [];

  for (const e of entries) {
    const values = e.initiative?.values ?? [];
    if (values.length === 0) {
      unrolled.push(e);
      continue;
    }
    const malus = sharedWoundMalus(e.wounds, e.effects);
    const usage = e.initiative?.usage ?? [];
    values.forEach((raw, dieIndex) => {
      const effective = raw + malus;
      const spent = usage[dieIndex] ?? null;
      rows.push({
        charId: e.charId,
        nom: e.nom,
        online: e.online,
        owner: e.owner,
        dieIndex,
        dieCount: values.length,
        raw,
        malus,
        effective,
        unusable: isLostDie(raw, malus, spent),
        used: spent?.use ?? null,
        rankValue: spent ? spent.at : effective,
      });
    });
  }

  rows.sort(
    (a, b) =>
      Number(a.unusable) - Number(b.unusable) ||
      b.rankValue - a.rankValue ||
      a.nom.localeCompare(b.nom) ||
      a.dieIndex - b.dieIndex,
  );
  unrolled.sort((a, b) => a.nom.localeCompare(b.nom));

  return { rows, unrolled, currentCount: currentCount(rows) };
}

/**
 * The count the table is at: the highest die nobody has played yet. Null once
 * every usable die is spent — the turn is over.
 */
export function currentCount(rows: readonly InitiativeRow[]): number | null {
  const next = rows.find((r) => !r.used && !r.unusable);
  return next ? next.rankValue : null;
}
