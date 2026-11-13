import { describe, expect, it } from 'vitest';

import { backupAge } from './backup-age';

const at = (d: string) => new Date(d).getTime();
const now = at('2026-11-13T10:00:00');

describe('backupAge', () => {
  it('never backed up is stale', () => {
    expect(backupAge(null, now)).toEqual({ label: 'jamais', stale: true });
  });

  it('counts calendar days, not 24h spans', () => {
    expect(backupAge(at('2026-11-13T00:01:00'), now).label).toBe("aujourd'hui");
    expect(backupAge(at('2026-11-12T23:50:00'), now).label).toBe('hier');
    expect(backupAge(at('2026-11-01T12:00:00'), now)).toEqual({
      label: 'il y a 12 jours',
      stale: false,
    });
  });

  it('turns stale past 14 days', () => {
    expect(backupAge(at('2026-10-30T10:00:00'), now).stale).toBe(false); // 14
    expect(backupAge(at('2026-10-29T10:00:00'), now).stale).toBe(true); // 15
  });

  it('a clock set backwards never prints a negative age', () => {
    expect(backupAge(at('2026-11-20T10:00:00'), now).label).toBe("aujourd'hui");
  });
});
