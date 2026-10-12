import { describe, it, expect } from 'vitest';
import { todayInBogota, addDaysToIsoDate } from './timezone';

describe('todayInBogota', () => {
  it('returns an ISO YYYY-MM-DD string', () => {
    expect(todayInBogota()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('stays on the same Bogota calendar day even once UTC has already rolled over', () => {
    // 2026-11-02T23:30:00-05:00 (Bogota) === 2026-11-03T04:30:00Z — a server computing
    // "today" from raw UTC (e.g. new Date().toISOString().slice(0, 10)) would say
    // 2026-11-03 here, a full day ahead of what it actually is in Bogota.
    const lateNightBogota = new Date('2026-11-03T04:30:00.000Z');
    expect(todayInBogota(lateNightBogota)).toBe('2026-11-02');
  });

  it('matches UTC date during Bogota daytime hours (no timezone drift at noon)', () => {
    const noonBogota = new Date('2026-11-02T17:00:00.000Z'); // 12:00 Bogota
    expect(todayInBogota(noonBogota)).toBe('2026-11-02');
  });
});

describe('addDaysToIsoDate', () => {
  it('adds days within the same month', () => {
    expect(addDaysToIsoDate('2026-11-02', 3)).toBe('2026-11-05');
  });

  it('rolls over a month boundary', () => {
    expect(addDaysToIsoDate('2026-11-29', 3)).toBe('2026-12-02');
  });

  it('rolls over a year boundary', () => {
    expect(addDaysToIsoDate('2026-12-30', 3)).toBe('2027-01-02');
  });

  it('supports negative offsets', () => {
    expect(addDaysToIsoDate('2026-11-02', -3)).toBe('2026-10-30');
  });
});
