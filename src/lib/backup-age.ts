/**
 * How old the last « Sauvegarder mes personnages » is, as the Plus tab prints
 * it — lowercase, since it ends « Dernière sauvegarde : … ». Counted in
 * CALENDAR days (local midnight to local midnight), so a backup made at 23:50
 * reads « hier » ten minutes later — the way a person counts.
 */
export const BACKUP_STALE_DAYS = 14;

export type BackupAge = { label: string; stale: boolean };

const DAY_MS = 86_400_000;
const midnight = (t: number) => new Date(t).setHours(0, 0, 0, 0);

export function backupAge(lastAt: number | null, now: number): BackupAge {
  if (lastAt == null) return { label: 'jamais', stale: true };
  // round, not floor: a DST change makes one local day 23 or 25 hours long.
  const days = Math.max(0, Math.round((midnight(now) - midnight(lastAt)) / DAY_MS));
  const label = days === 0 ? "aujourd'hui" : days === 1 ? 'hier' : `il y a ${days} jours`;
  return { label, stale: days > BACKUP_STALE_DAYS };
}
