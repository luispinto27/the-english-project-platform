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
  const now = opts.now ?? new Date();
  const base = new Date(now);
  base.setHours(12, 0, 0, 0);

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
