import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { sql } from 'drizzle-orm';
import { createDbClient } from './client';
import { bookings } from './schema';
import 'dotenv/config';

const testUrl = process.env.DATABASE_URL_TEST;

describe.skipIf(!testUrl)('schema', () => {
  const db = createDbClient(testUrl as string);

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

  afterAll(async () => {
    await db.execute(sql`DROP TABLE IF EXISTS bookings; DROP TABLE IF EXISTS weekly_slots;`);
  });

  it('rejects a second confirmed booking for the same date and slot', async () => {
    await db.insert(bookings).values({
      classDate: '2026-11-02', minuteOfDay: 360, name: 'A', email: 'a@a.com', phone: '3000000000',
    });

    await expect(
      db.insert(bookings).values({
        classDate: '2026-11-02', minuteOfDay: 360, name: 'B', email: 'b@b.com', phone: '3000000001',
      })
    ).rejects.toThrow();
  });

  it('allows a new confirmed booking once the conflicting one is cancelled', async () => {
    await db.update(bookings).set({ status: 'cancelled' }).where(sql`class_date = '2026-11-02' AND minute_of_day = 360`);

    await expect(
      db.insert(bookings).values({
        classDate: '2026-11-02', minuteOfDay: 360, name: 'C', email: 'c@c.com', phone: '3000000002',
      })
    ).resolves.toBeDefined();
  });
});
