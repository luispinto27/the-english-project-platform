import { config } from 'dotenv';
import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { sql } from 'drizzle-orm';
import { createDbClient } from './db/client';
import { weeklySlots } from './db/schema';
import { createBooking, cancelBooking } from './bookings';

config({ path: '.env.local' });
config({ path: '.env' });

const testUrl = process.env.DATABASE_URL_TEST;

describe.skipIf(!testUrl)('createBooking', () => {
  const db = createDbClient(testUrl as string);

  // This file runs as its own Vitest test file, and Vitest runs test files in parallel
  // by default — it must not assume lib/db/schema.test.ts (or an external `db:push`) has
  // already run and created the tables. This mirrors the exact bootstrap SQL from
  // lib/db/schema.test.ts's beforeAll, including the partial unique index that backs the
  // double-booking guard under test below.
  beforeAll(async () => {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS weekly_slots (
        id serial PRIMARY KEY,
        weekday smallint NOT NULL,
        minute_of_day smallint NOT NULL,
        active boolean NOT NULL DEFAULT true,
        UNIQUE (weekday, minute_of_day)
      );
      CREATE TABLE IF NOT EXISTS bookings (
        id serial PRIMARY KEY,
        class_date date NOT NULL,
        minute_of_day smallint NOT NULL,
        name text NOT NULL,
        email text NOT NULL,
        phone text NOT NULL,
        status text NOT NULL DEFAULT 'confirmed',
        created_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE UNIQUE INDEX IF NOT EXISTS bookings_date_slot_confirmed_idx
        ON bookings (class_date, minute_of_day) WHERE status = 'confirmed';
    `);
  });

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

  it('allows exactly one of several truly concurrent requests for the same date+slot to win', async () => {
    // Fires all 5 createBooking calls together (not sequentially awaited) so they race
    // against the same date+slot at the database level — the real concurrency guarantee
    // the double-booking guard is meant to provide, as opposed to the sequential
    // awaited-one-at-a-time test above.
    const contenders = Array.from({ length: 5 }, (_, i) => ({
      classDate: '2026-11-02',
      minuteOfDay: 360,
      name: `Contender ${i}`,
      email: `contender${i}@test.com`,
      phone: `300000000${i}`,
    }));

    const results = await Promise.all(contenders.map((input) => createBooking(db, input)));

    const wins = results.filter((r) => r.ok);
    const losses = results.filter((r) => !r.ok);
    expect(wins).toHaveLength(1);
    expect(losses).toHaveLength(4);
    for (const loss of losses) {
      expect(loss).toEqual({ ok: false, error: 'SLOT_TAKEN' });
    }
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
