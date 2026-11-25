/**
 * French agreement on a count: « 1 point », « 3 points », « −2 points ».
 * Returns the WORD only, so a sentence can agree several words on one count
 * (« 3 sortilèges copiés ont été corrigés »).
 */
export function plural(n: number, one: string, many = `${one}s`): string {
  return Math.abs(n) > 1 ? many : one;
}
