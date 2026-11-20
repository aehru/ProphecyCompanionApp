// Handing out a fixed pool of values, one per key — the caractéristiques'
// 7/6/6/5/5/4/4/3, the attributs' age row, a caste profile's 6/6/5/5/4.

export type Assign<K extends string> = Partial<Record<K, number>>;

/** The pool values still to hand out, in pool order. */
export function remainingValues<K extends string>(
  pool: readonly number[],
  assign: Assign<K>,
): number[] {
  const left = [...pool];
  for (const n of Object.values<number | undefined>(assign)) {
    const i = left.indexOf(n as number);
    if (i >= 0) left.splice(i, 1);
  }
  return left;
}

/**
 * Give `value` to `key`. Tapping its current value takes it back. A value none
 * of which is left is SWAPPED with a key holding it, so moving a 7 around never
 * needs an « unassign » first.
 */
export function assignValue<K extends string>(
  pool: readonly number[],
  assign: Assign<K>,
  key: K,
  value: number,
): Assign<K> {
  const next = { ...assign };
  if (next[key] === value) {
    delete next[key];
    return next;
  }
  if (!remainingValues(pool, assign).includes(value)) {
    const holder = (Object.keys(next) as K[]).find((k) => k !== key && next[k] === value);
    if (!holder) return assign;
    if (next[key] == null) delete next[holder];
    else next[holder] = next[key];
  }
  next[key] = value;
  return next;
}
