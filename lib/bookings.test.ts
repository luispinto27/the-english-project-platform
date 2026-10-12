import { config } from 'dotenv';
import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { sql } from 'drizzle-orm';
import { createDbClient } from './db/client';
import { weeklySlots } from './db/schema';
import { createBooking, cancelBooking } from './bookings';

config({ path: '.env.local' });
config({ path: '.env' });

const testUrl = process.env.DATABASE_URL_TEST;

describe.skipIf(!testUrl)('createBooking', () => {
  const db = createDbClient(testUrl as string);

  beforeEach(async () => {
    await db.execute(sql`TRUNCATE bookings, weekly_slots RESTART IDENTITY;`);
    await db.insert(weeklySlots).values({ weekday: 1, minuteOfDay: 360, active: true });
  });

  afterAll(async () => {
    await db.execute(sql`TRUNCATE bookings, weekly_slots RESTART IDENTITY;`);
  });

  it('creates a booking for an active slot', async () => {
    const result = await createBooking(db, {
      classDate: '2026-11-02', minuteOfDay: 360, name: 'Ana', email: 'ana@test.com', phone: '3001234567',
    });
    expect(result.ok).toBe(true);
  });

  it('rejects a booking for a slot that is not in weekly_slots', async () => {
    const result = await createBooking(db, {
      classDate: '2026-11-02', minuteOfDay: 999, name: 'Ana', email: 'ana@test.com', phone: '3001234567',
    });
    expect(result).toEqual({ ok: false, error: 'SLOT_NOT_AVAILABLE' });
  });

  it('rejects a booking for a slot that was deactivated after the client fetched availability', async () => {
    await db.update(weeklySlots).set({ active: false }).where(sql`weekday = 1 AND minute_of_day = 360`);
    const result = await createBooking(db, {
      classDate: '2026-11-02', minuteOfDay: 360, name: 'Ana', email: 'ana@test.com', phone: '3001234567',
    });
    expect(result).toEqual({ ok: false, error: 'SLOT_NOT_AVAILABLE' });
  });

  it('rejects a second confirmed booking for the same date+slot (race safety)', async () => {
    await createBooking(db, { classDate: '2026-11-02', minuteOfDay: 360, name: 'Ana', email: 'ana@test.com', phone: '3001234567' });
    const second = await createBooking(db, { classDate: '2026-11-02', minuteOfDay: 360, name: 'Beto', email: 'beto@test.com', phone: '3007654321' });
    expect(second).toEqual({ ok: false, error: 'SLOT_TAKEN' });
  });

  it('frees the slot again after cancelBooking', async () => {
    const first = await createBooking(db, { classDate: '2026-11-02', minuteOfDay: 360, name: 'Ana', email: 'ana@test.com', phone: '3001234567' });
    if (!first.ok) throw new Error('setup failed');
    await cancelBooking(db, first.booking.id);
    const second = await createBooking(db, { classDate: '2026-11-02', minuteOfDay: 360, name: 'Beto', email: 'beto@test.com', phone: '3007654321' });
    expect(second.ok).toBe(true);
  });
});
