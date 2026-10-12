import { config } from 'dotenv';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { sql } from 'drizzle-orm';
import { createDbClient } from './client';
import { bookings } from './schema';

config({ path: '.env.local' });
config({ path: '.env' });

const testUrl = process.env.DATABASE_URL_TEST;

describe.skipIf(!testUrl)('schema', () => {
  const db = createDbClient(testUrl as string);

  beforeAll(async () => {
    // The neon-http driver can't run multiple semicolon-separated statements
    // in one prepared statement — each CREATE must be its own db.execute() call.
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS weekly_slots (
        id serial PRIMARY KEY,
        weekday smallint NOT NULL,
        minute_of_day smallint NOT NULL,
        active boolean NOT NULL DEFAULT true,
        UNIQUE (weekday, minute_of_day)
      )
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS bookings (
        id serial PRIMARY KEY,
        class_date date NOT NULL,
        minute_of_day smallint NOT NULL,
        name text NOT NULL,
        email text NOT NULL,
        phone text NOT NULL,
        status text NOT NULL DEFAULT 'confirmed',
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await db.execute(sql`
      CREATE UNIQUE INDEX IF NOT EXISTS bookings_date_slot_confirmed_idx
        ON bookings (class_date, minute_of_day) WHERE status = 'confirmed'
    `);
  });

  afterAll(async () => {
    // Intentionally does NOT drop the tables: lib/bookings.test.ts runs as a separate
    // Vitest test file and Vitest runs files in parallel by default, so it can be racing
    // against this file against the same test database. Dropping the tables here would
    // yank them out from under bookings.test.ts mid-run. TRUNCATE instead leaves the
    // tables in place for whichever file's beforeAll/beforeEach runs next (both use
    // `CREATE TABLE IF NOT EXISTS`, so re-creation is idempotent either way).
    await db.execute(sql`TRUNCATE bookings, weekly_slots RESTART IDENTITY;`);
  });

  it('rejects a second confirmed booking for the same date and slot', async () => {
    await db.insert(bookings).values({
      classDate: '2026-12-01', minuteOfDay: 360, name: 'A', email: 'a@a.com', phone: '3000000000',
    });

    await expect(
      db.insert(bookings).values({
        classDate: '2026-12-01', minuteOfDay: 360, name: 'B', email: 'b@b.com', phone: '3000000001',
      })
    ).rejects.toThrow();
  });

  it('allows a new confirmed booking once the conflicting one is cancelled', async () => {
    await db.update(bookings).set({ status: 'cancelled' }).where(sql`class_date = '2026-12-01' AND minute_of_day = 360`);

    await expect(
      db.insert(bookings).values({
        classDate: '2026-12-01', minuteOfDay: 360, name: 'C', email: 'c@c.com', phone: '3000000002',
      })
    ).resolves.toBeDefined();
  });
});
