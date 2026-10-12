import { and, eq } from 'drizzle-orm';
import { weeklySlots, bookings } from './db/schema';
import type { db as DbClient } from './db/client';

export type CreateBookingInput = {
  classDate: string;
  minuteOfDay: number;
  name: string;
  email: string;
  phone: string;
};

export type CreateBookingResult =
  | { ok: true; booking: { id: number; classDate: string; minuteOfDay: number; name: string; email: string; phone: string } }
  | { ok: false; error: 'SLOT_NOT_AVAILABLE' | 'SLOT_TAKEN' };

function weekdayOf(isoDate: string): number {
  const [y, m, d] = isoDate.split('-').map(Number);
  return new Date(y, m - 1, d, 12).getDay();
}

export async function createBooking(
  db: typeof DbClient,
  input: CreateBookingInput
): Promise<CreateBookingResult> {
  const weekday = weekdayOf(input.classDate);

  const activeSlot = await db
    .select()
    .from(weeklySlots)
    .where(and(eq(weeklySlots.weekday, weekday), eq(weeklySlots.minuteOfDay, input.minuteOfDay), eq(weeklySlots.active, true)))
    .limit(1);

  if (activeSlot.length === 0) {
    return { ok: false, error: 'SLOT_NOT_AVAILABLE' };
  }

  try {
    const [row] = await db
      .insert(bookings)
      .values({
        classDate: input.classDate,
        minuteOfDay: input.minuteOfDay,
        name: input.name,
        email: input.email,
        phone: input.phone,
      })
      .returning();

    return {
      ok: true,
      booking: {
        id: row.id,
        classDate: row.classDate,
        minuteOfDay: row.minuteOfDay,
        name: row.name,
        email: row.email,
        phone: row.phone,
      },
    };
  } catch (err: unknown) {
    const dbErr = err as { code?: string; constraint?: string };
    if (dbErr?.code === '23505' && dbErr?.constraint === 'bookings_date_slot_confirmed_idx') {
      return { ok: false, error: 'SLOT_TAKEN' };
    }
    throw err;
  }
}

export async function cancelBooking(db: typeof DbClient, id: number): Promise<void> {
  await db.update(bookings).set({ status: 'cancelled' }).where(eq(bookings.id, id));
}
