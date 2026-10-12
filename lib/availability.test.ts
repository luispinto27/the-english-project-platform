import { describe, it, expect } from 'vitest';
import { computeAvailability } from './availability';
import { todayInBogota, addDaysToIsoDate } from './timezone';

const SUNDAY_2026_11_01 = new Date('2026-11-01T12:00:00');
const MONDAY_2026_11_02 = new Date('2026-11-02T12:00:00');

describe('computeAvailability', () => {
  it('returns no slots for a day with no active weekly_slots', () => {
    const result = computeAvailability([], [], { days: 1, now: MONDAY_2026_11_02 });
    expect(result).toHaveLength(1);
    expect(result[0].slots).toEqual([]);
  });

  it('includes an active slot as available when there is no booking for it', () => {
    const weeklySlots = [{ weekday: 1, minuteOfDay: 360, active: true }]; // Monday 6:00am
    const result = computeAvailability(weeklySlots, [], { days: 1, now: SUNDAY_2026_11_01 });
    expect(result[0].weekday).toBe(1);
    expect(result[0].slots).toEqual([{ minuteOfDay: 360, status: 'available' }]);
  });

  it('marks a slot booked when a confirmed booking exists for that exact date', () => {
    const weeklySlots = [
      { weekday: 1, minuteOfDay: 360, active: true }, // Monday
      { weekday: 2, minuteOfDay: 360, active: true }  // Tuesday
    ];
    const bookings = [{ classDate: '2026-11-03', minuteOfDay: 360 }]; // the Tuesday in range, not Monday
    const result = computeAvailability(weeklySlots, bookings, { days: 2, now: SUNDAY_2026_11_01 });
    expect(result[0].slots[0].status).toBe('available'); // Monday (02) untouched
    expect(result[1].slots[0].status).toBe('booked'); // Tuesday (03) booked
  });

  it('excludes an inactive weekly_slots row entirely', () => {
    const weeklySlots = [{ weekday: 1, minuteOfDay: 360, active: false }];
    const result = computeAvailability(weeklySlots, [], { days: 1, now: MONDAY_2026_11_02 });
    expect(result[0].slots).toEqual([]);
  });

  it('generates `days` consecutive calendar days starting the day after `now`', () => {
    const result = computeAvailability([], [], { days: 3, now: MONDAY_2026_11_02 });
    expect(result.map((d) => d.date)).toEqual(['2026-11-03', '2026-11-04', '2026-11-05']);
  });

  it('defaults to Bogota "today" (not server-local/UTC time) when `now` is omitted', () => {
    // Regression test: the server may run in UTC (e.g. on Vercel), which drifts a full
    // calendar day ahead of America/Bogota during part of the evening/night. The day
    // window must always be anchored to Bogota's actual calendar date, not whatever
    // `new Date()` reports in the server's own local time.
    const result = computeAvailability([], [], { days: 2 });
    const expectedFirstDay = addDaysToIsoDate(todayInBogota(), 1);
    const expectedSecondDay = addDaysToIsoDate(todayInBogota(), 2);
    expect(result.map((d) => d.date)).toEqual([expectedFirstDay, expectedSecondDay]);
  });
});
