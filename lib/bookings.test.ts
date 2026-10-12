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

// Regression coverage for the unique-violation unwrapping, independent of DATABASE_URL_TEST
// (which is intentionally left unset in most environments, so the describe block above never
// runs there). drizzle-orm's neon-http driver wraps the raw Postgres error inside a
// DrizzleQueryError and exposes the original error (carrying `.code`/`.constraint`) as `.cause`
// rather than on the thrown error itself — createBooking must unwrap that to still detect
// SLOT_TAKEN instead of letting the error propagate as an uncaught 500.
describe('createBooking (mocked db, error-unwrapping)', () => {
  function fakeDb(insertRejection: unknown) {
    return {
      select: () => ({
        from: () => ({
          where: () => ({
            limit: async () => [{ id: 1, weekday: 1, minuteOfDay: 360, active: true }],
          }),
        }),
      }),
      insert: () => ({
        values: () => ({
          returning: async () => {
            throw insertRejection;
          },
        }),
      }),
    } as unknown as typeof import('./db/client').db;
  }

  it('maps a unique-violation nested under .cause (DrizzleQueryError-style) to SLOT_TAKEN', async () => {
    const wrapped = new Error('Failed query: insert into "bookings" ...');
    (wrapped as unknown as { cause: unknown }).cause = {
      code: '23505',
      constraint: 'bookings_date_slot_confirmed_idx',
    };
    const result = await createBooking(fakeDb(wrapped), {
      classDate: '2026-11-02', minuteOfDay: 360, name: 'Ana', email: 'ana@test.com', phone: '3001234567',
    });
    expect(result).toEqual({ ok: false, error: 'SLOT_TAKEN' });
  });

  it('maps a top-level unique-violation (unwrapped) to SLOT_TAKEN', async () => {
    const result = await createBooking(fakeDb({ code: '23505', constraint: 'bookings_date_slot_confirmed_idx' }), {
      classDate: '2026-11-02', minuteOfDay: 360, name: 'Ana', email: 'ana@test.com', phone: '3001234567',
    });
    expect(result).toEqual({ ok: false, error: 'SLOT_TAKEN' });
  });

  it('rethrows an unrelated database error instead of swallowing it', async () => {
    const unrelated = new Error('connection reset');
    await expect(createBooking(fakeDb(unrelated), {
      classDate: '2026-11-02', minuteOfDay: 360, name: 'Ana', email: 'ana@test.com', phone: '3001234567',
    })).rejects.toThrow('connection reset');
  });
});
