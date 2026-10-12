import { todayInBogota } from './timezone';

export type WeeklySlot = { weekday: number; minuteOfDay: number; active: boolean };
export type ActiveBooking = { classDate: string; minuteOfDay: number };
export type DayAvailability = {
  date: string;
  weekday: number;
  slots: { minuteOfDay: number; status: 'available' | 'booked' }[];
};

function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function computeAvailability(
  weeklySlots: WeeklySlot[],
  activeBookings: ActiveBooking[],
  opts: { days: number; now?: Date }
): DayAvailability[] {
  // When `now` is explicitly provided (as every existing test does, for determinism),
  // keep the original behavior exactly: treat it as a plain local-time Date and do
  // calendar-date arithmetic on it directly — tests construct `now` as a plain local
  // Date and assert against plain calendar-date arithmetic, so forcing a Bogota-timezone
  // conversion on an explicitly-injected test date would break them.
  //
  // Only when `now` is omitted (real production use via `new Date()`) do we need to be
  // timezone-aware: the server's own local time is UTC on Vercel, which is a full
  // calendar day ahead of America/Bogota for part of the evening/night, so deriving
  // "today" from the server's local date would offset the whole day-generation window by
  // a day during those hours. Instead, derive Bogota's actual calendar "today" first, then
  // do the same local calendar-date arithmetic the tests rely on, anchored to that date.
  let base: Date;
  if (opts.now) {
    base = new Date(opts.now);
    base.setHours(12, 0, 0, 0);
  } else {
    const [y, m, d] = todayInBogota().split('-').map(Number);
    base = new Date(y, m - 1, d, 12, 0, 0, 0);
  }

  const bookedByDate = new Map<string, Set<number>>();
  for (const b of activeBookings) {
    if (!bookedByDate.has(b.classDate)) bookedByDate.set(b.classDate, new Set());
    bookedByDate.get(b.classDate)!.add(b.minuteOfDay);
  }

  const out: DayAvailability[] = [];
  for (let i = 1; i <= opts.days; i++) {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    const weekday = d.getDay();
    const isoDate = toIsoDate(d);
    const bookedMinutes = bookedByDate.get(isoDate) ?? new Set<number>();

    const slots = weeklySlots
      .filter((s) => s.weekday === weekday && s.active)
      .map((s) => ({
        minuteOfDay: s.minuteOfDay,
        status: (bookedMinutes.has(s.minuteOfDay) ? 'booked' : 'available') as 'available' | 'booked',
      }))
      .sort((a, b) => a.minuteOfDay - b.minuteOfDay);

    out.push({ date: isoDate, weekday, slots });
  }
  return out;
}
