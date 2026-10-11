# The English Project Platform Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and deploy a real Next.js site for "The English Project" with a database-backed trial-class booking flow (no double-booking) and a password-protected admin panel for David to manage availability and bookings.

**Architecture:** Next.js 14 App Router app, single repo, Postgres (Neon) via Drizzle ORM as the source of truth for weekly availability templates and bookings, Resend for transactional email, deployed on Vercel. A pure `computeAvailability` function merges the weekly template with existing bookings; a DB partial unique index is the final guard against double-booking races.

**Tech Stack:** Next.js 14 + TypeScript, drizzle-orm + drizzle-kit, @neondatabase/serverless, resend, @phosphor-icons/react, zod (input validation), Vitest + @testing-library/react (tests).

**Spec:** [docs/superpowers/specs/2026-10-11-the-english-project-platform-design.md](../specs/2026-10-11-the-english-project-platform-design.md)

## Global Constraints

- Visual identity must match the spec's tokens exactly: `--lime-500:#CCFF00`, black background, Poppins font, 2.5px black borders, hard offset shadows — reuse the token files verbatim rather than inventing new values.
- Double-booking must be impossible even under concurrent requests — enforced by a Postgres partial unique index (`status = 'confirmed'`), not only application logic.
- Admin routes (`/admin/*`, `/api/admin/*`) must be unreachable without a valid signed session cookie.
- Email sending failures must never block a successful booking from being saved and shown to the user.
- `ADMIN_NOTIFICATION_EMAIL` must be read from an environment variable, never hardcoded, so David can take it over later without a code change.
- No real third-party accounts exist yet (Neon, Resend, Vercel) — every task that needs one must work locally against `.env.local` values the user supplies, and must degrade to a clear skip/error message if the value is missing, never a silent no-op.

## Review Focus

- Booking a slot that was active in `weekly_slots` at page-load time but got deactivated by David a moment later — the service must re-check `active` at submission time, not trust the client. (Task 4)
- Two browsers racing for the same last-open slot — the second must get a `409`/`SLOT_TAKEN`, not a silent overwrite or a duplicate confirmed booking. (Task 2, Task 4)
- A cancelled booking's slot must become bookable again immediately (the partial unique index only blocks `status = 'confirmed'` rows). (Task 2, Task 4)
- Admin session cookie tampering (flipped characters, expired timestamp, wrong secret) must be rejected, not just "unsigned" cookies. (Task 7)
- Submitting the booking form with a name/email/phone that fails validation must surface a field-level error (client-side before submit, and server-side `400` if bypassed) instead of a generic failure or a 500. (Task 6, Task 12)

---

## Task 1: Project scaffold and design tokens

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.mjs`, `.gitignore`, `.env.example`
- Create: `app/layout.tsx`, `app/page.tsx`, `app/globals.css`
- Copy: design token CSS from `/Users/luisfelipepintogomez/Developer/Design System/The English Project Platform/_ds/the-english-project-design-system-149ad3c9-1f5c-41e6-9b9d-09a620194125/tokens/{colors,typography,spacing,fonts}.css` into `app/tokens/{colors,typography,spacing,fonts}.css`
- Copy: `assets/photos/student-laptop.png`, `assets/photos/student-notes.png` from the same mockup folder into `public/photos/`

**Interfaces:**
- Produces: `app/globals.css` importing all four token files and the Google Fonts `@import`, available to every component via Next's root layout.

- [ ] **Step 1: Initialize the Next.js project**

```bash
npx create-next-app@14 . --typescript --app --no-tailwind --no-src-dir --import-alias "@/*" --eslint --use-npm
```

When prompted, accept defaults. This scaffolds `package.json`, `tsconfig.json`, `next.config.mjs`, `app/layout.tsx`, `app/page.tsx`, `app/globals.css`.

- [ ] **Step 2: Copy the design tokens and photos verbatim**

```bash
mkdir -p app/tokens public/photos
SRC="/Users/luisfelipepintogomez/Developer/Design System/The English Project Platform"
cp "$SRC/_ds/the-english-project-design-system-149ad3c9-1f5c-41e6-9b9d-09a620194125/tokens/colors.css" app/tokens/colors.css
cp "$SRC/_ds/the-english-project-design-system-149ad3c9-1f5c-41e6-9b9d-09a620194125/tokens/typography.css" app/tokens/typography.css
cp "$SRC/_ds/the-english-project-design-system-149ad3c9-1f5c-41e6-9b9d-09a620194125/tokens/spacing.css" app/tokens/spacing.css
cp "$SRC/_ds/the-english-project-design-system-149ad3c9-1f5c-41e6-9b9d-09a620194125/tokens/fonts.css" app/tokens/fonts.css
cp "$SRC/assets/photos/student-laptop.png" public/photos/student-laptop.png
cp "$SRC/assets/photos/student-notes.png" public/photos/student-notes.png
```

- [ ] **Step 3: Replace `app/globals.css` to import the tokens and set base page styles**

```css
@import './tokens/fonts.css';
@import './tokens/colors.css';
@import './tokens/typography.css';
@import './tokens/spacing.css';

html, body { margin: 0; background: #000; color: #fff; font-family: var(--font-sans); }
* { box-sizing: border-box; }
a { color: var(--lime-500); text-decoration: underline; }
a:hover { color: var(--lime-400); }
```

- [ ] **Step 4: Replace `app/layout.tsx` with the site shell**

```tsx
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'The English Project',
  description: 'Clases de inglés 1-on-1 con metas reales.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 5: Replace `app/page.tsx` with a placeholder that proves the tokens loaded**

```tsx
export default function HomePage() {
  return (
    <main style={{ padding: 40 }}>
      <h1 style={{ font: '900 48px var(--font-sans)', color: 'var(--lime-500)' }}>
        The English Project
      </h1>
      <p>Scaffold OK.</p>
    </main>
  );
}
```

- [ ] **Step 6: Run the dev server and verify visually**

```bash
npm run dev
```

Open `http://localhost:3000` — expect a black page with "The English Project" in large lime-green Poppins text. Stop the server (Ctrl+C) once confirmed.

- [ ] **Step 7: Write `.env.example` and `.gitignore` entries**

```bash
cat > .env.example <<'EOF'
DATABASE_URL=
DATABASE_URL_TEST=
RESEND_API_KEY=
RESEND_FROM=
ADMIN_NOTIFICATION_EMAIL=luisfelipepint7@gmail.com
ADMIN_PASSWORD=
ADMIN_SESSION_SECRET=
EOF
printf '\n.env.local\n' >> .gitignore
```

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "Scaffold Next.js app with design tokens from mockup"
```

---

## Task 2: Database schema and client

**Files:**
- Create: `lib/db/schema.ts`, `lib/db/client.ts`, `drizzle.config.ts`
- Modify: `package.json` (add scripts `db:push`)
- Test: `lib/db/schema.test.ts`

**Interfaces:**
- Produces: `weeklySlots`, `bookings` Drizzle table objects from `lib/db/schema.ts`; `db` (a Drizzle client instance) from `lib/db/client.ts`, both imported by every later DB-touching task.

- [ ] **Step 1: Install dependencies**

```bash
npm install drizzle-orm @neondatabase/serverless
npm install -D drizzle-kit vitest dotenv
```

- [ ] **Step 2: Write `lib/db/schema.ts`**

```ts
import { pgTable, serial, smallint, boolean, text, date, timestamp, unique, uniqueIndex, sql } from 'drizzle-orm/pg-core';

export const weeklySlots = pgTable('weekly_slots', {
  id: serial('id').primaryKey(),
  weekday: smallint('weekday').notNull(),
  minuteOfDay: smallint('minute_of_day').notNull(),
  active: boolean('active').notNull().default(true),
}, (t) => ({
  weekdayMinuteUnique: unique('weekly_slots_weekday_minute_unique').on(t.weekday, t.minuteOfDay),
}));

export const bookings = pgTable('bookings', {
  id: serial('id').primaryKey(),
  classDate: date('class_date').notNull(),
  minuteOfDay: smallint('minute_of_day').notNull(),
  name: text('name').notNull(),
  email: text('email').notNull(),
  phone: text('phone').notNull(),
  status: text('status').notNull().default('confirmed'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  confirmedSlotUnique: uniqueIndex('bookings_date_slot_confirmed_idx')
    .on(t.classDate, t.minuteOfDay)
    .where(sql`${t.status} = 'confirmed'`),
}));
```

- [ ] **Step 3: Write `lib/db/client.ts`**

```ts
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as schema from './schema';

function requireDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL is not set. Copy .env.example to .env.local and fill it in.');
  }
  return url;
}

export const db = drizzle(neon(requireDatabaseUrl()), { schema });

export function createDbClient(databaseUrl: string) {
  return drizzle(neon(databaseUrl), { schema });
}
```

`createDbClient` exists so tests can point at `DATABASE_URL_TEST` instead of the real `DATABASE_URL`.

- [ ] **Step 4: Write `drizzle.config.ts`**

```ts
import { defineConfig } from 'drizzle-kit';
import 'dotenv/config';

export default defineConfig({
  schema: './lib/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: { url: process.env.DATABASE_URL! },
});
```

- [ ] **Step 5: Add the `db:push` script to `package.json`**

```json
"scripts": {
  "db:push": "drizzle-kit push"
}
```

- [ ] **Step 6: Write `lib/db/schema.test.ts` — verifies the schema pushes cleanly and the partial unique index actually rejects a second confirmed booking for the same slot**

This test requires a real Postgres database. Set `DATABASE_URL_TEST` in `.env.local` before running it (a free Neon project works). If it's unset, the test skips with a clear message rather than failing silently.

```ts
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
```

- [ ] **Step 7: Add a `test` script and `vitest.config.ts`, then run the test**

```json
"scripts": {
  "db:push": "drizzle-kit push",
  "test": "vitest run"
}
```

```ts
// vitest.config.ts
import { defineConfig } from 'vitest/config';
export default defineConfig({ test: { environment: 'node' } });
```

```bash
npm run test -- lib/db/schema.test.ts
```

Expected: both tests pass if `DATABASE_URL_TEST` is set, or the suite reports skipped if it isn't — either way, no failure.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "Add Drizzle schema for weekly_slots and bookings with anti-double-booking index"
```

---

## Task 3: Availability computation

**Files:**
- Create: `lib/availability.ts`
- Test: `lib/availability.test.ts`

**Interfaces:**
- Consumes: nothing (pure function, no DB).
- Produces: `computeAvailability(weeklySlots: WeeklySlot[], activeBookings: ActiveBooking[], opts: { days: number; now?: Date }): DayAvailability[]`, `WeeklySlot = { weekday: number; minuteOfDay: number; active: boolean }`, `ActiveBooking = { classDate: string; minuteOfDay: number }`, `DayAvailability = { date: string; weekday: number; slots: { minuteOfDay: number; status: 'available' | 'booked' }[] }`. Used by Task 6 (API route) and Task 12 (UI).

- [ ] **Step 1: Write the failing test**

```ts
// lib/availability.test.ts
import { describe, it, expect } from 'vitest';
import { computeAvailability } from './availability';

const MONDAY_2026_11_02 = new Date('2026-11-02T12:00:00');

describe('computeAvailability', () => {
  it('returns no slots for a day with no active weekly_slots', () => {
    const result = computeAvailability([], [], { days: 1, now: MONDAY_2026_11_02 });
    expect(result).toHaveLength(1);
    expect(result[0].slots).toEqual([]);
  });

  it('includes an active slot as available when there is no booking for it', () => {
    const weeklySlots = [{ weekday: 1, minuteOfDay: 360, active: true }]; // Monday 6:00am
    const result = computeAvailability(weeklySlots, [], { days: 1, now: MONDAY_2026_11_02 });
    expect(result[0].weekday).toBe(1);
    expect(result[0].slots).toEqual([{ minuteOfDay: 360, status: 'available' }]);
  });

  it('marks a slot booked when a confirmed booking exists for that exact date', () => {
    const weeklySlots = [{ weekday: 1, minuteOfDay: 360, active: true }];
    const bookings = [{ classDate: '2026-11-03', minuteOfDay: 360 }]; // the Tuesday in range, not Monday
    const result = computeAvailability(weeklySlots, bookings, { days: 2, now: MONDAY_2026_11_02 });
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
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npm run test -- lib/availability.test.ts
```

Expected: FAIL — `computeAvailability` is not defined (the file doesn't exist yet).

- [ ] **Step 3: Implement `lib/availability.ts`**

```ts
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
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
npm run test -- lib/availability.test.ts
```

Expected: all 5 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "Add pure computeAvailability function with unit tests"
```

---

## Task 4: Booking service (transactional create)

**Files:**
- Create: `lib/bookings.ts`
- Test: `lib/bookings.test.ts`

**Interfaces:**
- Consumes: `db` from `lib/db/client.ts` (Task 2), `weeklySlots`/`bookings` tables from `lib/db/schema.ts` (Task 2).
- Produces: `createBooking(db: DbClient, input: CreateBookingInput): Promise<CreateBookingResult>`, `CreateBookingInput = { classDate: string; minuteOfDay: number; name: string; email: string; phone: string }`, `CreateBookingResult = { ok: true; booking: { id: number; classDate: string; minuteOfDay: number; name: string; email: string; phone: string } } | { ok: false; error: 'SLOT_NOT_AVAILABLE' | 'SLOT_TAKEN' }`, `cancelBooking(db: DbClient, id: number): Promise<void>`. Used by Task 6 (public API) and Task 8 (admin cancel API).

- [ ] **Step 1: Write the failing test** (uses the same `DATABASE_URL_TEST` skip pattern as Task 2)

```ts
// lib/bookings.test.ts
import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { sql } from 'drizzle-orm';
import { createDbClient } from './db/client';
import { weeklySlots, bookings } from './db/schema';
import { createBooking, cancelBooking } from './bookings';
import 'dotenv/config';

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
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npm run test -- lib/bookings.test.ts
```

Expected: FAIL — `./bookings` module not found.

- [ ] **Step 3: Implement `lib/bookings.ts`**

```ts
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
  } catch (err: any) {
    if (String(err?.message ?? '').includes('bookings_date_slot_confirmed_idx') || err?.code === '23505') {
      return { ok: false, error: 'SLOT_TAKEN' };
    }
    throw err;
  }
}

export async function cancelBooking(db: typeof DbClient, id: number): Promise<void> {
  await db.update(bookings).set({ status: 'cancelled' }).where(eq(bookings.id, id));
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
npm run test -- lib/bookings.test.ts
```

Expected: all 5 tests PASS (or skipped if `DATABASE_URL_TEST` is unset).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "Add createBooking/cancelBooking service with conflict handling"
```

---

## Task 5: Email service (Resend)

**Files:**
- Create: `lib/email.ts`
- Test: `lib/email.test.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `sendBookingConfirmation(params: EmailBookingParams): Promise<void>`, `sendAdminNotification(params: EmailBookingParams): Promise<void>`, `EmailBookingParams = { name: string; email: string; phone: string; classDate: string; minuteOfDay: number; dayLabel: string; timeLabel: string; whatsappUrl: string }`. Used by Task 6 (booking API route).

- [ ] **Step 1: Install Resend**

```bash
npm install resend
```

- [ ] **Step 2: Write the failing test** (mocks the Resend SDK so no network call happens and no API key is required)

```ts
// lib/email.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const sendMock = vi.fn().mockResolvedValue({ data: { id: 'test' }, error: null });
vi.mock('resend', () => ({
  Resend: vi.fn().mockImplementation(() => ({ emails: { send: sendMock } })),
}));

import { sendBookingConfirmation, sendAdminNotification } from './email';

const params = {
  name: 'Ana', email: 'ana@test.com', phone: '3001234567',
  classDate: '2026-11-02', minuteOfDay: 360,
  dayLabel: 'lunes, 2 de noviembre', timeLabel: '6:00 am – 6:30 am',
  whatsappUrl: 'https://wa.me/573143643282?text=hola',
};

beforeEach(() => {
  sendMock.mockClear();
  process.env.RESEND_API_KEY = 'test-key';
  process.env.ADMIN_NOTIFICATION_EMAIL = 'luisfelipepint7@gmail.com';
});

describe('sendBookingConfirmation', () => {
  it('sends to the student email with the day/time in the body', async () => {
    await sendBookingConfirmation(params);
    expect(sendMock).toHaveBeenCalledTimes(1);
    const call = sendMock.mock.calls[0][0];
    expect(call.to).toEqual(['ana@test.com']);
    expect(call.html).toContain('lunes, 2 de noviembre');
    expect(call.html).toContain('6:00 am – 6:30 am');
  });

  it('does not throw if Resend fails, so the booking still succeeds', async () => {
    sendMock.mockRejectedValueOnce(new Error('network down'));
    await expect(sendBookingConfirmation(params)).resolves.toBeUndefined();
  });
});

describe('sendAdminNotification', () => {
  it('sends to ADMIN_NOTIFICATION_EMAIL with the student contact details', async () => {
    await sendAdminNotification(params);
    const call = sendMock.mock.calls[0][0];
    expect(call.to).toEqual(['luisfelipepint7@gmail.com']);
    expect(call.html).toContain('Ana');
    expect(call.html).toContain('3001234567');
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

```bash
npm run test -- lib/email.test.ts
```

Expected: FAIL — `./email` module not found.

- [ ] **Step 4: Implement `lib/email.ts`**

```ts
import { Resend } from 'resend';

export type EmailBookingParams = {
  name: string;
  email: string;
  phone: string;
  classDate: string;
  minuteOfDay: number;
  dayLabel: string;
  timeLabel: string;
  whatsappUrl: string;
};

function getClient(): Resend {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error('RESEND_API_KEY is not set.');
  return new Resend(key);
}

function getFromAddress(): string {
  // Falls back to Resend's shared test sender, which works with no domain
  // verification — swap in a verified address via RESEND_FROM once a real
  // domain is attached to the project (see README).
  return process.env.RESEND_FROM ?? 'The English Project <onboarding@resend.dev>';
}

const wrapper = (title: string, bodyHtml: string) => `
<div style="background:#000;color:#fff;font-family:Poppins,system-ui,sans-serif;padding:32px;">
  <div style="background:#CCFF00;color:#000;display:inline-block;padding:6px 10px;font-weight:900;transform:rotate(-2deg);">The English Project</div>
  <h1 style="font-weight:900;font-size:28px;margin:20px 0 8px;">${title}</h1>
  ${bodyHtml}
</div>`;

export async function sendBookingConfirmation(p: EmailBookingParams): Promise<void> {
  const html = wrapper('¡Tu prueba quedó agendada!', `
    <p style="font-weight:300;font-size:16px;">Nos vemos el <b>${p.dayLabel}</b>, de ${p.timeLabel}, hora de Colombia.</p>
    <p style="font-weight:300;font-size:16px;">Profesor: David E. García V. — el enlace de la videollamada llega por WhatsApp un día antes.</p>
    <p><a href="${p.whatsappUrl}" style="color:#CCFF00;">Escribirle a David por WhatsApp</a></p>
  `);
  try {
    const client = getClient();
    await client.emails.send({
      from: getFromAddress(),
      to: [p.email],
      subject: 'Tu prueba de inglés quedó agendada',
      html,
    });
  } catch (err) {
    console.error('sendBookingConfirmation failed', err);
  }
}

export async function sendAdminNotification(p: EmailBookingParams): Promise<void> {
  const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL;
  if (!adminEmail) {
    console.error('ADMIN_NOTIFICATION_EMAIL is not set; skipping admin notification.');
    return;
  }
  const html = wrapper('Nueva reserva', `
    <p style="font-weight:300;font-size:16px;"><b>${p.name}</b> reservó para el ${p.dayLabel}, ${p.timeLabel}.</p>
    <p style="font-weight:300;font-size:16px;">Correo: ${p.email}<br/>Teléfono/WhatsApp: ${p.phone}</p>
  `);
  try {
    const client = getClient();
    await client.emails.send({
      from: getFromAddress(),
      to: [adminEmail],
      subject: `Nueva reserva: ${p.name} — ${p.dayLabel}`,
      html,
    });
  } catch (err) {
    console.error('sendAdminNotification failed', err);
  }
}
```

- [ ] **Step 5: Run the test to verify it passes**

```bash
npm run test -- lib/email.test.ts
```

Expected: all 3 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "Add Resend email service for booking confirmation and admin notification"
```

---

## Task 6: Public API routes

**Files:**
- Create: `app/api/availability/route.ts`, `app/api/bookings/route.ts`
- Create: `lib/format.ts`, `lib/booking-links.ts`
- Test: `lib/format.test.ts`, `lib/booking-links.test.ts`

**Interfaces:**
- Consumes: `computeAvailability` (Task 3), `createBooking` (Task 4), `sendBookingConfirmation`/`sendAdminNotification` (Task 5), `db` (Task 2).
- Produces: `fmtTime(minuteOfDay: number): string`, `fmtDayLabel(isoDate: string): string` from `lib/format.ts`; `buildGcalUrl(params): string`, `buildWhatsappUrl(params): string` from `lib/booking-links.ts`; `GET /api/availability?days=N` → `DayAvailability[]`; `POST /api/bookings` → `201` with booking + links, or `409`/`400` with `{ error: string }`. Used by Task 12 (booking UI).

- [ ] **Step 1: Write the failing tests for the pure helpers**

```ts
// lib/format.test.ts
import { describe, it, expect } from 'vitest';
import { fmtTime, fmtDayLabel } from './format';

describe('fmtTime', () => {
  it('formats morning minutes as am', () => expect(fmtTime(360)).toBe('6:00 am'));
  it('formats afternoon minutes as pm', () => expect(fmtTime(1140)).toBe('7:00 pm'));
  it('formats noon as 12:00 m', () => expect(fmtTime(720)).toBe('12:00 m'));
});

describe('fmtDayLabel', () => {
  it('formats an ISO date as a long Spanish weekday label', () => {
    expect(fmtDayLabel('2026-11-02')).toBe('lunes, 2 de noviembre');
  });
});
```

```ts
// lib/booking-links.test.ts
import { describe, it, expect } from 'vitest';
import { buildGcalUrl, buildWhatsappUrl } from './booking-links';

describe('buildGcalUrl', () => {
  it('builds a 30-minute Google Calendar template URL for the booked slot', () => {
    const url = buildGcalUrl({ classDate: '2026-11-02', minuteOfDay: 360 });
    expect(url).toContain('calendar.google.com/calendar/render');
    expect(url).toContain('20261102T060000');
    expect(url).toContain('20261102T063000');
  });
});

describe('buildWhatsappUrl', () => {
  it('builds a wa.me link to David with the day and time in the message', () => {
    const url = buildWhatsappUrl({ dayLabel: 'lunes, 2 de noviembre', timeLabel: '6:00 am' });
    expect(url).toContain('https://wa.me/573143643282');
    expect(decodeURIComponent(url)).toContain('lunes, 2 de noviembre');
  });
});
```

- [ ] **Step 2: Run both to verify they fail**

```bash
npm run test -- lib/format.test.ts lib/booking-links.test.ts
```

Expected: FAIL — modules not found.

- [ ] **Step 3: Implement `lib/format.ts`**

```ts
const WEEKDAYS_LONG = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

export function fmtTime(minuteOfDay: number): string {
  const h = Math.floor(minuteOfDay / 60);
  const mm = String(minuteOfDay % 60).padStart(2, '0');
  if (h === 12 && minuteOfDay % 60 === 0) return '12:00 m';
  const h12 = h % 12 || 12;
  return `${h12}:${mm} ${h < 12 ? 'am' : 'pm'}`;
}

export function fmtDayLabel(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  const date = new Date(y, m - 1, d, 12);
  return `${WEEKDAYS_LONG[date.getDay()]}, ${date.getDate()} de ${MONTHS[date.getMonth()]}`;
}
```

- [ ] **Step 4: Implement `lib/booking-links.ts`**

```ts
function stamp(isoDate: string, minuteOfDay: number): string {
  const h = String(Math.floor(minuteOfDay / 60)).padStart(2, '0');
  const mm = String(minuteOfDay % 60).padStart(2, '0');
  return `${isoDate.replace(/-/g, '')}T${h}${mm}00`;
}

export function buildGcalUrl(p: { classDate: string; minuteOfDay: number }): string {
  const start = stamp(p.classDate, p.minuteOfDay);
  const end = stamp(p.classDate, p.minuteOfDay + 30);
  const text = encodeURIComponent('Prueba de inglés · The English Project');
  const details = encodeURIComponent('Sesión de prueba 1-on-1 con David E. Garcia V.');
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${start}/${end}&ctz=America/Bogota&details=${details}`;
}

export function buildWhatsappUrl(p: { dayLabel: string; timeLabel: string }): string {
  const text = encodeURIComponent(`¡Hola David! Agendé una prueba para el ${p.dayLabel} a las ${p.timeLabel}.`);
  return `https://wa.me/573143643282?text=${text}`;
}
```

- [ ] **Step 5: Run the tests to verify they pass**

```bash
npm run test -- lib/format.test.ts lib/booking-links.test.ts
```

Expected: all 5 tests PASS.

- [ ] **Step 6: Implement `app/api/availability/route.ts`**

```ts
import { NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { weeklySlots, bookings } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { computeAvailability } from '@/lib/availability';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const days = Number(searchParams.get('days') ?? '14');

  const slots = await db.select().from(weeklySlots);
  const confirmed = await db
    .select({ classDate: bookings.classDate, minuteOfDay: bookings.minuteOfDay })
    .from(bookings)
    .where(eq(bookings.status, 'confirmed'));

  const result = computeAvailability(slots, confirmed, { days });
  return NextResponse.json(result);
}
```

- [ ] **Step 7: Implement `app/api/bookings/route.ts`**

```ts
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db/client';
import { createBooking } from '@/lib/bookings';
import { sendBookingConfirmation, sendAdminNotification } from '@/lib/email';
import { fmtDayLabel, fmtTime } from '@/lib/format';
import { buildGcalUrl, buildWhatsappUrl } from '@/lib/booking-links';

const bodySchema = z.object({
  classDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  minuteOfDay: z.number().int().min(0).max(1439),
  name: z.string().trim().min(2, 'Escribe tu nombre'),
  email: z.string().trim().email('Revisa tu correo'),
  phone: z.string().refine((v) => v.replace(/\D/g, '').length >= 7, 'Escribe un número válido'),
});

export async function POST(request: Request) {
  const json = await request.json();
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }, { status: 400 });
  }

  const result = await createBooking(db, parsed.data);
  if (!result.ok) {
    const status = result.error === 'SLOT_TAKEN' ? 409 : 400;
    const message = result.error === 'SLOT_TAKEN'
      ? 'Ese horario ya fue tomado, elige otro.'
      : 'Ese horario ya no está disponible, elige otro.';
    return NextResponse.json({ error: message }, { status });
  }

  const dayLabel = fmtDayLabel(result.booking.classDate);
  const timeLabel = `${fmtTime(result.booking.minuteOfDay)} – ${fmtTime(result.booking.minuteOfDay + 30)}`;
  const whatsappUrl = buildWhatsappUrl({ dayLabel, timeLabel: fmtTime(result.booking.minuteOfDay) });
  const gcalUrl = buildGcalUrl({ classDate: result.booking.classDate, minuteOfDay: result.booking.minuteOfDay });

  const emailParams = { ...result.booking, dayLabel, timeLabel, whatsappUrl };
  await Promise.all([sendBookingConfirmation(emailParams), sendAdminNotification(emailParams)]);

  return NextResponse.json({ booking: result.booking, dayLabel, timeLabel, whatsappUrl, gcalUrl }, { status: 201 });
}
```

- [ ] **Step 8: Install zod and manually verify the routes against a real test database**

```bash
npm install zod
npm run db:push
npm run dev
curl "http://localhost:3000/api/availability?days=3"
```

Expected: a JSON array of 3 days (empty `slots` until Task 8 lets you activate some via the admin API, or insert a row manually with `psql`/Neon's SQL editor for this manual check). Stop the dev server once confirmed.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "Add public availability and bookings API routes"
```

---

## Task 7: Admin session auth

**Files:**
- Create: `lib/auth.ts`, `app/api/admin/login/route.ts`, `app/api/admin/logout/route.ts`, `middleware.ts`
- Test: `lib/auth.test.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `createSessionToken(secret: string, now?: Date): string`, `verifySessionToken(token: string, secret: string, now?: Date): boolean`, cookie name constant `ADMIN_SESSION_COOKIE = 'admin_session'`. Used by Task 8 (admin API) and Task 13 (admin UI) indirectly through `middleware.ts`.

- [ ] **Step 1: Write the failing test**

```ts
// lib/auth.test.ts
import { describe, it, expect } from 'vitest';
import { createSessionToken, verifySessionToken } from './auth';

const SECRET = 'test-secret';

describe('session token', () => {
  it('verifies a token it just created', () => {
    const token = createSessionToken(SECRET, new Date('2026-11-02T12:00:00Z'));
    expect(verifySessionToken(token, SECRET, new Date('2026-11-02T12:05:00Z'))).toBe(true);
  });

  it('rejects a token signed with a different secret', () => {
    const token = createSessionToken('other-secret', new Date('2026-11-02T12:00:00Z'));
    expect(verifySessionToken(token, SECRET, new Date('2026-11-02T12:05:00Z'))).toBe(false);
  });

  it('rejects a tampered token', () => {
    const token = createSessionToken(SECRET, new Date('2026-11-02T12:00:00Z'));
    const tampered = token.slice(0, -1) + (token.slice(-1) === 'a' ? 'b' : 'a');
    expect(verifySessionToken(tampered, SECRET, new Date('2026-11-02T12:05:00Z'))).toBe(false);
  });

  it('rejects an expired token (default lifetime is 7 days)', () => {
    const token = createSessionToken(SECRET, new Date('2026-11-02T12:00:00Z'));
    expect(verifySessionToken(token, SECRET, new Date('2026-11-10T12:00:01Z'))).toBe(false);
  });

  it('rejects a malformed token', () => {
    expect(verifySessionToken('not-a-real-token', SECRET)).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npm run test -- lib/auth.test.ts
```

Expected: FAIL — `./auth` module not found.

- [ ] **Step 3: Implement `lib/auth.ts`**

```ts
import { createHmac, timingSafeEqual } from 'crypto';

export const ADMIN_SESSION_COOKIE = 'admin_session';
const SESSION_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;

function sign(value: string, secret: string): string {
  return createHmac('sha256', secret).update(value).digest('hex');
}

export function createSessionToken(secret: string, now: Date = new Date()): string {
  const expires = now.getTime() + SESSION_LIFETIME_MS;
  const payload = `admin.${expires}`;
  return `${payload}.${sign(payload, secret)}`;
}

export function verifySessionToken(token: string, secret: string, now: Date = new Date()): boolean {
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  const [tag, expiresStr, signature] = parts;
  if (tag !== 'admin') return false;
  const payload = `${tag}.${expiresStr}`;
  const expected = sign(payload, secret);

  const a = Buffer.from(signature, 'hex');
  const b = Buffer.from(expected, 'hex');
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;

  const expires = Number(expiresStr);
  if (!Number.isFinite(expires) || now.getTime() > expires) return false;

  return true;
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
npm run test -- lib/auth.test.ts
```

Expected: all 5 tests PASS.

- [ ] **Step 5: Implement `app/api/admin/login/route.ts`**

```ts
import { NextResponse } from 'next/server';
import { createSessionToken, ADMIN_SESSION_COOKIE } from '@/lib/auth';

export async function POST(request: Request) {
  const { password } = await request.json();
  const expected = process.env.ADMIN_PASSWORD;
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!expected || !secret) {
    return NextResponse.json({ error: 'Admin auth is not configured.' }, { status: 500 });
  }
  if (password !== expected) {
    return NextResponse.json({ error: 'Contraseña incorrecta' }, { status: 401 });
  }

  const token = createSessionToken(secret);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60,
  });
  return res;
}
```

- [ ] **Step 6: Implement `app/api/admin/logout/route.ts`**

```ts
import { NextResponse } from 'next/server';
import { ADMIN_SESSION_COOKIE } from '@/lib/auth';

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(ADMIN_SESSION_COOKIE);
  return res;
}
```

- [ ] **Step 7: Implement `middleware.ts`** (protects both admin pages and admin API routes)

```ts
import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken, ADMIN_SESSION_COOKIE } from '@/lib/auth';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isAdminArea = pathname.startsWith('/admin') && pathname !== '/admin/login';
  const isAdminApi = pathname.startsWith('/api/admin') && pathname !== '/api/admin/login';
  if (!isAdminArea && !isAdminApi) return NextResponse.next();

  const token = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  const secret = process.env.ADMIN_SESSION_SECRET;
  const valid = !!token && !!secret && verifySessionToken(token, secret);

  if (valid) return NextResponse.next();

  if (isAdminApi) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  return NextResponse.redirect(new URL('/admin/login', request.url));
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
};
```

- [ ] **Step 8: Manually verify the login flow**

```bash
# in .env.local
echo 'ADMIN_PASSWORD=test1234' >> .env.local
echo "ADMIN_SESSION_SECRET=$(openssl rand -hex 32)" >> .env.local
npm run dev
curl -i http://localhost:3000/api/admin/login -X POST -H "Content-Type: application/json" -d '{"password":"wrong"}'
curl -i http://localhost:3000/api/admin/login -X POST -H "Content-Type: application/json" -d '{"password":"test1234"}'
```

Expected: the first `curl` returns `401`; the second returns `200` with a `Set-Cookie: admin_session=...` header. Stop the dev server once confirmed.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "Add admin session auth (login/logout) and route-protecting middleware"
```

---

## Task 8: Admin API routes

**Files:**
- Create: `app/api/admin/weekly-slots/route.ts`, `app/api/admin/bookings/route.ts`, `app/api/admin/bookings/[id]/cancel/route.ts`

**Interfaces:**
- Consumes: `db`, `weeklySlots`, `bookings` (Task 2), `cancelBooking` (Task 4). Protected by `middleware.ts` (Task 7) — these routes assume the request already passed auth.
- Produces: `GET /api/admin/weekly-slots` → `WeeklySlot[]`; `POST /api/admin/weekly-slots` body `{ weekday, minuteOfDay, active }` → upserts the row; `GET /api/admin/bookings` → upcoming confirmed bookings; `POST /api/admin/bookings/:id/cancel` → cancels one. Used by Task 13 (admin UI).

- [ ] **Step 1: Implement `app/api/admin/weekly-slots/route.ts`**

```ts
import { NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { weeklySlots } from '@/lib/db/schema';

export async function GET() {
  const rows = await db.select().from(weeklySlots);
  return NextResponse.json(rows);
}

export async function POST(request: Request) {
  const { weekday, minuteOfDay, active } = await request.json();
  if (typeof weekday !== 'number' || typeof minuteOfDay !== 'number' || typeof active !== 'boolean') {
    return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });
  }

  const existing = await db
    .select()
    .from(weeklySlots)
    .where(and(eq(weeklySlots.weekday, weekday), eq(weeklySlots.minuteOfDay, minuteOfDay)))
    .limit(1);

  if (existing.length > 0) {
    await db.update(weeklySlots).set({ active }).where(eq(weeklySlots.id, existing[0].id));
  } else {
    await db.insert(weeklySlots).values({ weekday, minuteOfDay, active });
  }

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: Implement `app/api/admin/bookings/route.ts`**

```ts
import { NextResponse } from 'next/server';
import { and, eq, gte } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { bookings } from '@/lib/db/schema';

export async function GET() {
  const today = new Date().toISOString().slice(0, 10);
  const rows = await db
    .select()
    .from(bookings)
    .where(and(eq(bookings.status, 'confirmed'), gte(bookings.classDate, today)))
    .orderBy(bookings.classDate, bookings.minuteOfDay);
  return NextResponse.json(rows);
}
```

- [ ] **Step 3: Implement `app/api/admin/bookings/[id]/cancel/route.ts`**

```ts
import { NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { cancelBooking } from '@/lib/bookings';

export async function POST(_request: Request, { params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (!Number.isInteger(id)) {
    return NextResponse.json({ error: 'id inválido' }, { status: 400 });
  }
  await cancelBooking(db, id);
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 4: Manually verify end-to-end against the test database**

```bash
npm run dev
# In another terminal, using the admin_session cookie captured from Task 7's Step 8:
curl -i http://localhost:3000/api/admin/weekly-slots -X POST -H "Content-Type: application/json" \
  --cookie "admin_session=<paste token>" \
  -d '{"weekday":1,"minuteOfDay":360,"active":true}'
curl http://localhost:3000/api/admin/weekly-slots --cookie "admin_session=<paste token>"
curl "http://localhost:3000/api/availability?days=7"
```

Expected: the weekly-slots POST returns `{"ok":true}`, the GET lists the row just created, and `/api/availability` now shows an available slot on the next Monday. Stop the dev server once confirmed.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "Add admin API routes for weekly slots and booking management"
```

---

## Task 9: Core UI primitives (Button, Badge, Input, Highlight)

**Files:**
- Create: `components/ui/Button.tsx`, `components/ui/Button.module.css`
- Create: `components/ui/Badge.tsx`, `components/ui/Badge.module.css`
- Create: `components/ui/Input.tsx`, `components/ui/Input.module.css`
- Create: `components/ui/Highlight.tsx`, `components/ui/Highlight.module.css`
- Test: `components/ui/Button.test.tsx`, `components/ui/Input.test.tsx`
- Modify: `package.json` (test deps), `vitest.config.ts` (jsdom setup)

**Interfaces:**
- Produces: `<Button>`, `<Badge>`, `<Input>`, `<Highlight>` — used by Task 10, 11, 12, 13.

- [ ] **Step 1: Install testing-library deps**

```bash
npm install -D @testing-library/react @testing-library/jest-dom jsdom
```

- [ ] **Step 2: Add a setup file and register it in `vitest.config.ts`**

```ts
// vitest.setup.ts
import '@testing-library/jest-dom/vitest';
```

```ts
// vitest.config.ts
import { defineConfig } from 'vitest/config';
export default defineConfig({ test: { environment: 'node', setupFiles: ['./vitest.setup.ts'] } });
```

- [ ] **Step 3: Write the failing tests**

```tsx
// components/ui/Button.test.tsx
// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from './Button';

describe('Button', () => {
  it('renders its label', () => {
    render(<Button>Agendar</Button>);
    expect(screen.getByText('Agendar')).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Agendar</Button>);
    fireEvent.click(screen.getByText('Agendar'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('does not call onClick when disabled', () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick} disabled>Agendar</Button>);
    fireEvent.click(screen.getByText('Agendar'));
    expect(onClick).not.toHaveBeenCalled();
  });
});
```

```tsx
// components/ui/Input.test.tsx
// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Input } from './Input';

describe('Input', () => {
  it('shows the error message instead of the helper when error is set', () => {
    render(<Input label="Correo" value="" onChange={() => {}} error="Revisa tu correo" helper="texto de ayuda" />);
    expect(screen.getByText('Revisa tu correo')).toBeInTheDocument();
    expect(screen.queryByText('texto de ayuda')).not.toBeInTheDocument();
  });

  it('calls onChange with the new value as the user types', () => {
    const onChange = vi.fn();
    render(<Input label="Nombre" value="" onChange={onChange} />);
    fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: 'Ana' } });
    expect(onChange).toHaveBeenCalledWith('Ana');
  });
});
```

- [ ] **Step 4: Run the tests to verify they fail**

```bash
npm run test -- components/ui/Button.test.tsx components/ui/Input.test.tsx
```

Expected: FAIL — components don't exist yet.

- [ ] **Step 5: Implement `components/ui/Button.tsx` and `Button.module.css`**

```tsx
'use client';
import type { ComponentType } from 'react';
import styles from './Button.module.css';

type IconProps = { size?: number; weight?: 'fill' | 'bold' };

export function Button({
  children,
  size = 'lg',
  variant = 'solid',
  fullWidth = false,
  disabled = false,
  iconLeft,
  iconRight,
  onClick,
  type = 'button',
}: {
  children: React.ReactNode;
  size?: 'sm' | 'lg';
  variant?: 'solid' | 'outline';
  fullWidth?: boolean;
  disabled?: boolean;
  iconLeft?: ComponentType<IconProps>;
  iconRight?: ComponentType<IconProps>;
  onClick?: () => void;
  type?: 'button' | 'submit';
}) {
  const IconLeft = iconLeft;
  const IconRight = iconRight;
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={[styles.button, styles[size], styles[variant], fullWidth ? styles.fullWidth : ''].join(' ')}
    >
      {IconLeft ? <IconLeft size={size === 'lg' ? 20 : 16} weight="bold" /> : null}
      <span>{children}</span>
      {IconRight ? <IconRight size={size === 'lg' ? 20 : 16} weight="bold" /> : null}
    </button>
  );
}
```

```css
/* components/ui/Button.module.css */
.button {
  display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  font-family: var(--font-sans); font-weight: 700; border-radius: 999px;
  border: 2.5px solid #000; cursor: pointer; transition: transform 160ms ease-out;
  white-space: nowrap;
}
.button:hover:not(:disabled) { transform: translateY(-2px); }
.button:disabled { cursor: not-allowed; opacity: 0.5; transform: none; }
.sm { padding: 6px 14px; font-size: 14px; min-height: 36px; }
.lg { padding: 14px 24px; font-size: 16px; min-height: 56px; }
.solid { background: var(--lime-500); color: #000; }
.solid:hover:not(:disabled) { background: var(--lime-400); }
.outline { background: transparent; color: #fff; border-color: #fff; }
.fullWidth { width: 100%; }
```

- [ ] **Step 6: Implement `components/ui/Badge.tsx` and `Badge.module.css`**

```tsx
import styles from './Badge.module.css';

export function Badge({ children, tone = 'outline' }: { children: React.ReactNode; tone?: 'outline' | 'dark' }) {
  return <span className={[styles.badge, styles[tone]].join(' ')}>{children}</span>;
}
```

```css
/* components/ui/Badge.module.css */
.badge {
  display: inline-flex; align-items: center; height: 24px; padding: 0 10px;
  border-radius: 999px; font: 600 12px/1 var(--font-sans); border: 1.5px solid currentColor;
}
.outline { color: var(--ink-500); border-color: var(--ink-200); }
.dark { background: #000; color: #fff; border-color: #000; }
```

- [ ] **Step 7: Implement `components/ui/Input.tsx` and `Input.module.css`**

```tsx
'use client';
import { useId } from 'react';
import styles from './Input.module.css';

export function Input({
  label,
  type = 'text',
  placeholder,
  value,
  onChange,
  error,
  helper,
}: {
  label: string;
  type?: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  helper?: string;
}) {
  const id = useId();
  return (
    <label className={styles.wrapper} htmlFor={id}>
      <span className={styles.label}>{label}</span>
      <input
        id={id}
        className={[styles.input, error ? styles.inputError : ''].join(' ')}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {error ? <span className={styles.error}>{error}</span> : helper ? <span className={styles.helper}>{helper}</span> : null}
    </label>
  );
}
```

```css
/* components/ui/Input.module.css */
.wrapper { display: flex; flex-direction: column; gap: 6px; font-family: var(--font-sans); }
.label { font: 700 13px/1.2 var(--font-sans); }
.input { border: 2.5px solid #000; border-radius: 14px; padding: 12px 14px; font: 400 15px var(--font-sans); background: #fff; color: #000; }
.input:focus { outline: 2px solid var(--mint-500); outline-offset: 1px; }
.inputError { border-color: var(--danger-500); }
.error { color: var(--danger-500); font: 500 12px var(--font-sans); }
.helper { color: var(--ink-500); font: 300 12px var(--font-sans); }
```

- [ ] **Step 8: Implement `components/ui/Highlight.tsx` and `Highlight.module.css`**

```tsx
import styles from './Highlight.module.css';

export function Highlight({ children }: { children: React.ReactNode }) {
  return <span className={styles.highlight}>{children}</span>;
}
```

```css
/* components/ui/Highlight.module.css */
.highlight {
  display: inline-block; background: var(--lime-500); color: #000;
  padding: 2px 8px; transform: rotate(-2deg); border-radius: 6px;
}
```

- [ ] **Step 9: Run the tests to verify they pass**

```bash
npm run test -- components/ui/Button.test.tsx components/ui/Input.test.tsx
```

Expected: all 5 tests PASS.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "Add Button, Badge, Input, Highlight UI primitives"
```

---

## Task 10: TimeSlot, PhotoFrame, Footer components

**Files:**
- Create: `components/ui/TimeSlot.tsx`, `components/ui/TimeSlot.module.css`
- Create: `components/ui/PhotoFrame.tsx`, `components/ui/PhotoFrame.module.css`
- Create: `components/ui/Footer.tsx`, `components/ui/Footer.module.css`
- Test: `components/ui/TimeSlot.test.tsx`

**Interfaces:**
- Produces: `<TimeSlot time status selected onClick>`, `<PhotoFrame src alt ratio>`, `<Footer note>` — used by Task 11 (Hero, Footer) and Task 12 (time picker).

- [ ] **Step 1: Write the failing test**

```tsx
// components/ui/TimeSlot.test.tsx
// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TimeSlot } from './TimeSlot';

describe('TimeSlot', () => {
  it('renders the time label', () => {
    render(<TimeSlot time="6:00 am" status="available" selected={false} onClick={() => {}} />);
    expect(screen.getByText('6:00 am')).toBeInTheDocument();
  });

  it('is not clickable when booked', () => {
    const onClick = vi.fn();
    render(<TimeSlot time="6:00 am" status="booked" selected={false} onClick={onClick} />);
    fireEvent.click(screen.getByText('6:00 am'));
    expect(onClick).not.toHaveBeenCalled();
  });

  it('calls onClick when available and clicked', () => {
    const onClick = vi.fn();
    render(<TimeSlot time="6:00 am" status="available" selected={false} onClick={onClick} />);
    fireEvent.click(screen.getByText('6:00 am'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npm run test -- components/ui/TimeSlot.test.tsx
```

Expected: FAIL — `./TimeSlot` not found.

- [ ] **Step 3: Implement `components/ui/TimeSlot.tsx` and `TimeSlot.module.css`**

```tsx
'use client';
import styles from './TimeSlot.module.css';

export function TimeSlot({
  time,
  status,
  selected,
  onClick,
}: {
  time: string;
  status: 'available' | 'booked';
  selected: boolean;
  onClick: () => void;
}) {
  const cls = [styles.slot, selected ? styles.selected : status === 'booked' ? styles.booked : styles.available].join(' ');
  return (
    <button type="button" className={cls} disabled={status === 'booked'} onClick={onClick}>
      {time}
    </button>
  );
}
```

```css
/* components/ui/TimeSlot.module.css */
.slot {
  min-height: 46px; width: 100%; border-radius: 12px; border: 2.5px solid #000;
  font: 600 14px var(--font-sans); cursor: pointer;
}
.available { background: #fff; color: #000; }
.booked { background: var(--ink-200); color: var(--ink-500); border-color: var(--ink-200); cursor: not-allowed; }
.selected { background: #000; color: var(--lime-500); border-color: var(--lime-500); }
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
npm run test -- components/ui/TimeSlot.test.tsx
```

Expected: all 3 tests PASS.

- [ ] **Step 5: Implement `components/ui/PhotoFrame.tsx` and `PhotoFrame.module.css`** (no test — static presentational wrapper around `next/image`)

```tsx
import Image from 'next/image';
import styles from './PhotoFrame.module.css';

export function PhotoFrame({ src, alt, ratio = '4 / 5' }: { src: string; alt: string; ratio?: string }) {
  return (
    <div className={styles.frame} style={{ aspectRatio: ratio }}>
      <Image src={src} alt={alt} fill style={{ objectFit: 'cover' }} />
    </div>
  );
}
```

```css
/* components/ui/PhotoFrame.module.css */
.frame {
  position: relative; width: 100%; border-radius: 32px; border: 10px solid #fff;
  overflow: hidden; box-shadow: 0 18px 40px rgba(0, 0, 0, 0.35);
}
```

- [ ] **Step 6: Implement `components/ui/Footer.tsx` and `Footer.module.css`** (no test — static presentational)

```tsx
import styles from './Footer.module.css';

export function Footer({ note }: { note: string }) {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <span className={styles.brand}>The English Project</span>
        <p className={styles.note}>{note}</p>
      </div>
    </footer>
  );
}
```

```css
/* components/ui/Footer.module.css */
.footer { background: #000; border-top: 1.5px solid var(--ink-700); padding: 40px 0; }
.inner { max-width: 1200px; margin: 0 auto; padding: 0 clamp(20px, 4vw, 32px); display: flex; flex-direction: column; gap: 8px; }
.brand { font: 900 18px var(--font-sans); color: #fff; }
.note { font: 300 14px var(--font-sans); color: var(--ink-300); margin: 0; }
```

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "Add TimeSlot, PhotoFrame, Footer components"
```

---

## Task 11: Landing page — Hero and Services sections

**Files:**
- Create: `components/sections/Hero.tsx`, `components/sections/Hero.module.css`
- Create: `components/sections/Services.tsx`, `components/sections/Services.module.css`, `lib/services-data.ts`
- Modify: `app/page.tsx`
- Test: `components/sections/Services.test.tsx`

**Interfaces:**
- Consumes: `Button` (Task 9), `Highlight` (Task 9), `Badge` (Task 9), `PhotoFrame`, `Footer` (Task 10).
- Produces: `<Hero onAgendaClick={() => void}>`, `<Services>`. Used by `app/page.tsx`, which Task 12 will extend with the booking section.

- [ ] **Step 1: Write `lib/services-data.ts`** (copied straight from the mockup's `services` array)

```ts
export const SERVICES = [
  { icon: 'chalkboard-teacher', title: 'Clases de inglés A1 – C1', who: 'Para empezar o subir de nivel', desc: 'Un plan a tu medida con las cuatro habilidades y metas realistas en cada etapa.', tags: ['A1 – C1', '4 habilidades'] },
  { icon: 'chats-circle', title: 'Sesiones de conversación', who: 'Si entiendes pero te cuesta hablar', desc: 'Práctica oral real para ganar fluidez, pronunciación y confianza al usar el idioma.', tags: ['Speaking', 'Confianza'] },
  { icon: 'exam', title: 'Preparación para exámenes', who: 'Estudio, migración o trabajo', desc: 'Estrategia, formato y simulacros con retroalimentación para el examen que necesitas.', tags: ['TOEFL', 'IELTS', 'CELPIP', 'OET'] },
  { icon: 'briefcase', title: 'Inglés para profesionales', who: 'Para tu día a día laboral', desc: 'Reuniones, correos, presentaciones y entrevistas con el vocabulario de tu industria.', tags: ['Negocios', 'Salud', 'Tech'] },
] as const;
```

- [ ] **Step 2: Write the failing test**

```tsx
// components/sections/Services.test.tsx
// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Services } from './Services';

describe('Services', () => {
  it('renders one card per service in SERVICES', () => {
    render(<Services />);
    expect(screen.getByText('Clases de inglés A1 – C1')).toBeInTheDocument();
    expect(screen.getByText('Inglés para profesionales')).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

```bash
npm run test -- components/sections/Services.test.tsx
```

Expected: FAIL — `./Services` not found.

- [ ] **Step 4: Implement `components/sections/Services.tsx` and `Services.module.css`**

```tsx
import { ChalkboardTeacher, ChatsCircle, Exam, Briefcase } from '@phosphor-icons/react/dist/ssr';
import type { Icon } from '@phosphor-icons/react';
import { Badge } from '@/components/ui/Badge';
import { SERVICES } from '@/lib/services-data';
import styles from './Services.module.css';

const ICONS: Record<string, Icon> = {
  'chalkboard-teacher': ChalkboardTeacher,
  'chats-circle': ChatsCircle,
  exam: Exam,
  briefcase: Briefcase,
};

export function Services() {
  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <div className={styles.heading}>
          <span className={styles.eyebrow}>Servicios</span>
          <h2 className={styles.title}>¿Qué ofrezco y para quién?</h2>
          <p className={styles.lead}>
            Todo es virtual y 1-on-1, trabajando listening, reading, speaking y writing — y la confianza para usarlos.
          </p>
        </div>
        <div className={styles.grid}>
          {SERVICES.map((s) => {
            const ServiceIcon = ICONS[s.icon];
            return (
              <div key={s.title} className={styles.card}>
                <div className={styles.cardTop}>
                  <div className={styles.iconBox}>
                    <ServiceIcon size={26} weight="fill" />
                  </div>
                  <span className={styles.who}>{s.who}</span>
                </div>
                <h3 className={styles.cardTitle}>{s.title}</h3>
                <p className={styles.cardDesc}>{s.desc}</p>
                <div className={styles.tags}>
                  {s.tags.map((t) => (
                    <Badge key={t} tone="outline">{t}</Badge>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
```

```css
/* components/sections/Services.module.css */
.section { background: var(--ink-700); padding: clamp(56px, 8vw, 96px) 0; }
.inner { max-width: 1200px; margin: 0 auto; padding: 0 clamp(20px, 4vw, 32px); display: flex; flex-direction: column; gap: 32px; }
.heading { display: flex; flex-direction: column; gap: 12px; }
.eyebrow { font: 700 12px var(--font-sans); letter-spacing: .08em; text-transform: uppercase; color: var(--lime-500); }
.title { margin: 0; font: 900 clamp(32px, 7vw, 56px)/1 var(--font-sans); letter-spacing: -0.04em; }
.lead { margin: 0; font: 300 17px/1.5 var(--font-sans); color: var(--ink-300); max-width: 620px; }
.grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 250px), 1fr)); gap: 16px; }
.card { background: #fff; color: #000; border: 2.5px solid #000; border-radius: 24px; padding: 22px; display: flex; flex-direction: column; gap: 12px; }
.cardTop { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.iconBox { width: 48px; height: 48px; border-radius: 14px; background: var(--lime-500); border: 1.5px solid #000; display: flex; align-items: center; justify-content: center; color: #000; flex: none; }
.who { font: 600 12px/1.2 var(--font-sans); color: var(--ink-500); text-align: right; }
.cardTitle { margin: 0; font: 800 21px/1.15 var(--font-sans); letter-spacing: -0.02em; }
.cardDesc { margin: 0; font: 300 15px/1.5 var(--font-sans); color: var(--ink-700); }
.tags { display: flex; flex-wrap: wrap; gap: 6px; margin-top: auto; padding-top: 4px; }
```

- [ ] **Step 5: Run the test to verify it passes**

```bash
npm run test -- components/sections/Services.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Implement `components/sections/Hero.tsx` and `Hero.module.css`** (no test — static presentational, verified visually in Step 8)

```tsx
import { ArrowRight, Asterisk } from '@phosphor-icons/react/dist/ssr';
import { Button } from '@/components/ui/Button';
import { Highlight } from '@/components/ui/Highlight';
import { PhotoFrame } from '@/components/ui/PhotoFrame';
import styles from './Hero.module.css';

export function Hero({ onAgendaClick }: { onAgendaClick: () => void }) {
  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <div className={styles.copy}>
          <div className={styles.kicker}>In the AI age, learning skills is more relevant than ever.</div>
          <h1 className={styles.title}>
            Clases de inglés <Highlight>1-on-1</Highlight> con metas reales.
          </h1>
          <p className={styles.lead}>
            <Asterisk size={28} weight="fill" color="var(--lime-500)" />
            <span>Clases virtuales ajustadas a tus intereses, con tiempos realistas y alineadas a estándares internacionales.</span>
          </p>
          <div className={styles.ctaBlock}>
            <Button size="lg" iconRight={ArrowRight} onClick={onAgendaClick}>
              Agenda tu prueba gratis de 30 min
            </Button>
            <span className={styles.ctaNote}>Sin cuenta ni pagos. Solo eliges un horario y dejas tus datos.</span>
          </div>
          <div className={styles.teacher}>
            <div className={styles.avatar}>DG</div>
            <div>
              <div className={styles.teacherName}>Teacher: David E. Garcia V.</div>
              <div className={styles.teacherNote}>Más de 10 años enseñando inglés</div>
            </div>
          </div>
        </div>
        <div className={styles.photo}>
          <PhotoFrame src="/photos/student-laptop.png" alt="Estudiante tomando clase de inglés en su laptop" ratio="4 / 5" />
        </div>
      </div>
    </section>
  );
}
```

```css
/* components/sections/Hero.module.css */
.section { padding: clamp(40px, 8vw, 88px) 0 clamp(56px, 8vw, 96px); overflow: hidden; }
.inner { max-width: 1200px; margin: 0 auto; padding: 0 clamp(20px, 4vw, 32px); display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 340px), 1fr)); gap: clamp(36px, 6vw, 64px); align-items: center; }
.copy { display: flex; flex-direction: column; gap: 22px; }
.kicker { font: 700 15px/1.3 var(--font-sans); transform: rotate(-2deg); transform-origin: left; color: var(--ink-300); }
.title { margin: 0; font: 900 clamp(40px, 10vw, 84px)/0.95 var(--font-sans); letter-spacing: -0.045em; }
.lead { margin: 0; display: flex; gap: 10px; font: italic 300 clamp(18px, 4.4vw, 22px)/1.35 var(--font-sans); max-width: 540px; }
.ctaBlock { display: flex; flex-direction: column; gap: 10px; margin-top: 4px; }
.ctaNote { font: 300 14px/1.4 var(--font-sans); color: var(--ink-300); }
.teacher { display: flex; align-items: center; gap: 14px; padding-top: 18px; border-top: 1.5px solid var(--ink-700); }
.avatar { width: 44px; height: 44px; border-radius: 999px; background: var(--lime-500); color: #000; display: flex; align-items: center; justify-content: center; font: 900 16px var(--font-sans); }
.teacherName { font: 800 17px/1.2 var(--font-sans); letter-spacing: -0.01em; }
.teacherNote { font: 300 14px/1.3 var(--font-sans); color: var(--ink-300); }
.photo { max-width: 440px; width: 100%; justify-self: center; }
```

- [ ] **Step 7: Wire `Hero`, `Services`, and `Footer` into `app/page.tsx`** (booking section placeholder comment is replaced in Task 12)

```tsx
'use client';
import { useRef } from 'react';
import { Hero } from '@/components/sections/Hero';
import { Services } from '@/components/sections/Services';
import { Footer } from '@/components/ui/Footer';

export default function HomePage() {
  const agendaRef = useRef<HTMLDivElement>(null);
  const scrollToAgenda = () => agendaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  return (
    <main>
      <Hero onAgendaClick={scrollToAgenda} />
      <Services />
      <div ref={agendaRef} style={{ scrollMarginTop: 64 }}>
        {/* Task 12 replaces this with <BookingFlow /> */}
      </div>
      <Footer note="Clases virtuales 1-on-1 · A1 – C1 · TOEFL, IELTS, CELPIP, OET" />
    </main>
  );
}
```

- [ ] **Step 8: Run the dev server and verify visually against the mockup**

```bash
npm run dev
```

Open `http://localhost:3000` — expect the hero, teacher byline, and four service cards to visually match `The English Project.dc.html`'s sections 01–02 (black background, lime accents, Poppins, hard black borders on the white cards). Stop the dev server once confirmed.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "Add Hero and Services sections, wire into the home page"
```

---

## Task 12: Booking flow UI

**Files:**
- Create: `lib/validate.ts`
- Create: `components/sections/BookingFlow.tsx`, `components/sections/BookingFlow.module.css`
- Modify: `app/page.tsx`
- Test: `lib/validate.test.ts`, `components/sections/BookingFlow.test.tsx`

**Interfaces:**
- Consumes: `GET /api/availability` and `POST /api/bookings` (Task 6), `Button`/`Input`/`Badge` (Task 9), `TimeSlot` (Task 10), `fmtTime`/`fmtDayLabel` (Task 6).
- Produces: `<BookingFlow>` — the final piece wired into `app/page.tsx`.

- [ ] **Step 1: Write the failing test for the pure validators**

```ts
// lib/validate.test.ts
import { describe, it, expect } from 'vitest';
import { nameValid, emailValid, phoneValid } from './validate';

describe('nameValid', () => {
  it('rejects a single character', () => expect(nameValid('A')).toBe(false));
  it('accepts a real name', () => expect(nameValid('Ana')).toBe(true));
});

describe('emailValid', () => {
  it('rejects a string with no @', () => expect(emailValid('ana.test.com')).toBe(false));
  it('accepts a well-formed email', () => expect(emailValid('ana@test.com')).toBe(true));
});

describe('phoneValid', () => {
  it('rejects fewer than 7 digits', () => expect(phoneValid('123456')).toBe(false));
  it('accepts a 10-digit Colombian number regardless of formatting', () => expect(phoneValid('300 000 0000')).toBe(true));
});
```

- [ ] **Step 2: Run the test to verify it fails, then implement `lib/validate.ts`**

```bash
npm run test -- lib/validate.test.ts
```

Expected: FAIL — module not found.

```ts
// lib/validate.ts
export function nameValid(name: string): boolean {
  return name.trim().length >= 2;
}

export function emailValid(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function phoneValid(phone: string): boolean {
  return phone.replace(/\D/g, '').length >= 7;
}
```

```bash
npm run test -- lib/validate.test.ts
```

Expected: all 6 tests PASS.

- [ ] **Step 3: Write the failing test for `BookingFlow`** (mocks `global.fetch`; no real network or database)

```tsx
// components/sections/BookingFlow.test.tsx
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BookingFlow } from './BookingFlow';

const AVAILABILITY = [
  { date: '2026-11-02', weekday: 1, slots: [{ minuteOfDay: 360, status: 'available' }] },
  { date: '2026-11-03', weekday: 2, slots: [] },
];

function mockFetchSequence(responses: Array<{ status: number; body: unknown }>) {
  let call = 0;
  vi.stubGlobal('fetch', vi.fn(() => {
    const r = responses[Math.min(call, responses.length - 1)];
    call += 1;
    return Promise.resolve({
      ok: r.status >= 200 && r.status < 300,
      status: r.status,
      json: () => Promise.resolve(r.body),
    } as Response);
  }));
}

beforeEach(() => {
  vi.unstubAllGlobals();
});

describe('BookingFlow', () => {
  it('loads availability and lets the user pick the only open day', async () => {
    mockFetchSequence([{ status: 200, body: AVAILABILITY }]);
    render(<BookingFlow />);
    await waitFor(() => expect(screen.getByText('6:00 am')).toBeInTheDocument());
  });

  it('keeps the submit button disabled until a slot is chosen and the form is valid, then submits', async () => {
    mockFetchSequence([
      { status: 200, body: AVAILABILITY },
      { status: 201, body: { booking: { id: 1, classDate: '2026-11-02', minuteOfDay: 360, name: 'Ana', email: 'ana@test.com', phone: '3001234567' }, dayLabel: 'lunes, 2 de noviembre', timeLabel: '6:00 am – 6:30 am', whatsappUrl: 'https://wa.me/573143643282', gcalUrl: 'https://calendar.google.com/x' } },
    ]);
    render(<BookingFlow />);
    await waitFor(() => screen.getByText('6:00 am'));

    fireEvent.click(screen.getByText('6:00 am'));
    fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: 'Ana' } });
    fireEvent.change(screen.getByLabelText('Correo'), { target: { value: 'ana@test.com' } });
    fireEvent.change(screen.getByLabelText('Teléfono / WhatsApp'), { target: { value: '3001234567' } });

    fireEvent.click(screen.getByText(/^Agendar/));

    await waitFor(() => expect(screen.getByText(/¡Listo, Ana!/)).toBeInTheDocument());
  });

  it('shows field errors instead of submitting when the form is invalid', async () => {
    const fetchSpy = vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve(AVAILABILITY) } as Response));
    vi.stubGlobal('fetch', fetchSpy);
    render(<BookingFlow />);
    await waitFor(() => screen.getByText('6:00 am'));

    fireEvent.click(screen.getByText('6:00 am'));
    fireEvent.change(screen.getByLabelText('Correo'), { target: { value: 'not-an-email' } });
    fireEvent.click(screen.getByText(/^Agendar/));

    expect(await screen.findByText('Escribe tu nombre')).toBeInTheDocument();
    expect(screen.getByText('Revisa tu correo')).toBeInTheDocument();
    expect(screen.getByText('Escribe un número válido')).toBeInTheDocument();
    expect(fetchSpy).toHaveBeenCalledTimes(1); // only the initial availability GET — no POST attempted
  });

  it('shows a retry message and re-fetches availability when the slot was just taken (409)', async () => {
    mockFetchSequence([
      { status: 200, body: AVAILABILITY },
      { status: 409, body: { error: 'Ese horario ya fue tomado, elige otro.' } },
      { status: 200, body: [{ date: '2026-11-02', weekday: 1, slots: [{ minuteOfDay: 360, status: 'booked' }] }] },
    ]);
    render(<BookingFlow />);
    await waitFor(() => screen.getByText('6:00 am'));

    fireEvent.click(screen.getByText('6:00 am'));
    fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: 'Ana' } });
    fireEvent.change(screen.getByLabelText('Correo'), { target: { value: 'ana@test.com' } });
    fireEvent.change(screen.getByLabelText('Teléfono / WhatsApp'), { target: { value: '3001234567' } });
    fireEvent.click(screen.getByText(/^Agendar/));

    await waitFor(() => expect(screen.getByText('Ese horario ya fue tomado, elige otro.')).toBeInTheDocument());
  });
});
```

- [ ] **Step 4: Run the test to verify it fails**

```bash
npm run test -- components/sections/BookingFlow.test.tsx
```

Expected: FAIL — `./BookingFlow` not found.

- [ ] **Step 5: Implement `components/sections/BookingFlow.tsx`**

```tsx
'use client';
import { useEffect, useState } from 'react';
import { CalendarCheck, ChalkboardTeacher, WhatsappLogo, CheckCircle } from '@phosphor-icons/react/dist/ssr';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { TimeSlot } from '@/components/ui/TimeSlot';
import { fmtTime, fmtDayLabel } from '@/lib/format';
import { nameValid, emailValid, phoneValid } from '@/lib/validate';
import styles from './BookingFlow.module.css';

type DayAvailability = { date: string; weekday: number; slots: { minuteOfDay: number; status: 'available' | 'booked' }[] };
type BookingResponse = { booking: { id: number; classDate: string; minuteOfDay: number; name: string; email: string; phone: string }; dayLabel: string; timeLabel: string; whatsappUrl: string; gcalUrl: string };

const WEEKDAY_SHORT = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

export function BookingFlow() {
  const [days, setDays] = useState<DayAvailability[] | null>(null);
  const [dayIdx, setDayIdx] = useState<number | null>(null);
  const [slot, setSlot] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [tried, setTried] = useState(false);
  const [sending, setSending] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [result, setResult] = useState<BookingResponse | null>(null);

  async function loadAvailability() {
    const res = await fetch('/api/availability?days=14');
    const data: DayAvailability[] = await res.json();
    setDays(data);
    if (dayIdx === null) {
      const firstOpen = data.findIndex((d) => d.slots.some((s) => s.status === 'available'));
      setDayIdx(firstOpen === -1 ? 0 : firstOpen);
    }
  }

  useEffect(() => {
    loadAvailability();
  }, []);

  if (!days) return <section className={styles.section}><p className={styles.loading}>Cargando disponibilidad…</p></section>;

  const day = dayIdx !== null ? days[dayIdx] : undefined;
  const nameOk = nameValid(name);
  const emailOk = emailValid(email);
  const phoneOk = phoneValid(phone);
  const ready = slot !== null && nameOk && emailOk && phoneOk;

  async function submit() {
    if (!ready || !day) {
      setTried(true);
      return;
    }
    setSending(true);
    setSubmitError(null);
    const res = await fetch('/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ classDate: day.date, minuteOfDay: slot, name, email, phone }),
    });
    const data = await res.json();
    setSending(false);
    if (!res.ok) {
      setSubmitError(data.error ?? 'Error inesperado, intenta de nuevo.');
      setSlot(null);
      await loadAvailability();
      return;
    }
    setResult(data as BookingResponse);
  }

  if (result) {
    const firstName = result.booking.name.trim().split(/\s+/)[0] ?? '';
    return (
      <section className={styles.section}>
        <div className={styles.confirmWrap}>
          <CheckCircle size={56} weight="fill" color="var(--lime-500)" />
          <h2 className={styles.confirmTitle}>¡Listo, {firstName}!</h2>
          <p className={styles.confirmLead}>Tu prueba quedó agendada. Te envié la invitación a <b>{result.booking.email}</b>.</p>
          <div className={styles.confirmCard}>
            <div className={styles.confirmCardHeader}>
              <span>Prueba de 30 minutos</span>
              <Badge tone="dark">Virtual · 1-on-1</Badge>
            </div>
            <div className={styles.confirmCardBody}>
              <div className={styles.confirmRow}><CalendarCheck size={24} weight="bold" /><div><div className={styles.confirmRowTitle}>{result.dayLabel}</div><div>{result.timeLabel} · hora de Colombia</div></div></div>
              <div className={styles.confirmRow}><ChalkboardTeacher size={24} weight="bold" /><div><div className={styles.confirmRowTitle}>David E. Garcia V.</div><div>Videollamada — el enlace va en la invitación</div></div></div>
              <div className={styles.confirmRow}><WhatsappLogo size={24} weight="fill" /><div><div className={styles.confirmRowTitle}>{result.booking.phone}</div><div>Te escribo por aquí un día antes</div></div></div>
            </div>
          </div>
          <a href={result.gcalUrl} target="_blank" rel="noopener"><Button size="lg" fullWidth iconLeft={CalendarCheck}>Añadir a mi calendario</Button></a>
          <a href={result.whatsappUrl} target="_blank" rel="noopener"><Button size="lg" variant="outline" fullWidth iconLeft={WhatsappLogo}>Escribirle a David</Button></a>
        </div>
      </section>
    );
  }

  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <div className={styles.heading}>
          <span className={styles.eyebrow}>Disponibilidad</span>
          <h2 className={styles.title}>Agenda tu prueba gratis</h2>
          <p className={styles.lead}>30 minutos para conocerte, ver tu nivel y contarte cómo trabajamos. Hora de Colombia (GMT-5).</p>
        </div>
        <div className={styles.grid}>
          <div className={styles.card}>
            <div className={styles.cardHeader}><span>1. Elige el día</span></div>
            <div className={styles.dayScroller}>
              {days.map((d, i) => {
                const free = d.slots.filter((s) => s.status === 'available').length;
                const off = free === 0;
                const selected = i === dayIdx;
                const dow = new Date(d.date + 'T12:00:00').getDay();
                return (
                  <button
                    key={d.date}
                    disabled={off}
                    onClick={() => { setDayIdx(i); setSlot(null); }}
                    className={[styles.dayBtn, selected ? styles.dayBtnSelected : off ? styles.dayBtnOff : ''].join(' ')}
                  >
                    <span className={styles.dayWd}>{WEEKDAY_SHORT[dow]}</span>
                    <span className={styles.dayNum}>{Number(d.date.slice(-2))}</span>
                    <span className={styles.dayNote}>{off ? 'Sin cupos' : `${free} ${free === 1 ? 'cupo' : 'cupos'}`}</span>
                  </button>
                );
              })}
            </div>
            <div className={styles.cardHeader}><span>2. Elige la hora</span></div>
            <div className={styles.slotsGrid}>
              {(day?.slots ?? []).map((s) => (
                <TimeSlot
                  key={s.minuteOfDay}
                  time={fmtTime(s.minuteOfDay)}
                  status={s.status}
                  selected={s.minuteOfDay === slot}
                  onClick={() => setSlot(s.minuteOfDay)}
                />
              ))}
            </div>
          </div>

          <div className={styles.formCard}>
            <span className={styles.cardHeader}>3. Tus datos</span>
            {submitError ? <div className={styles.submitError}>{submitError}</div> : null}
            <Input label="Nombre" placeholder="Tu nombre completo" value={name} onChange={setName} error={tried && !nameOk ? 'Escribe tu nombre' : undefined} />
            <Input label="Correo" type="email" placeholder="tu@correo.com" value={email} onChange={setEmail} error={tried && !emailOk ? 'Revisa tu correo' : undefined} helper="Aquí llega la invitación con el enlace de la videollamada." />
            <Input label="Teléfono / WhatsApp" type="tel" placeholder="300 000 0000" value={phone} onChange={setPhone} error={tried && !phoneOk ? 'Escribe un número válido' : undefined} />
            <Button size="lg" fullWidth disabled={sending} onClick={submit}>
              {sending ? 'Agendando…' : slot === null ? 'Elige un horario' : `Agendar ${fmtTime(slot)}`}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 6: Add `components/sections/BookingFlow.module.css`**

```css
.section { padding: clamp(56px, 8vw, 96px) 0; }
.loading { max-width: 1200px; margin: 0 auto; padding: 0 clamp(20px, 4vw, 32px); color: var(--ink-300); }
.inner { max-width: 1200px; margin: 0 auto; padding: 0 clamp(20px, 4vw, 32px); display: flex; flex-direction: column; gap: 28px; }
.heading { display: flex; flex-direction: column; gap: 12px; }
.eyebrow { font: 700 12px var(--font-sans); letter-spacing: .08em; text-transform: uppercase; color: var(--lime-500); }
.title { margin: 0; font: 900 clamp(32px, 7vw, 56px)/1 var(--font-sans); letter-spacing: -0.04em; }
.lead { margin: 0; font: 300 17px/1.5 var(--font-sans); color: var(--ink-300); max-width: 620px; }
.grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 400px), 1fr)); gap: 20px; align-items: start; }
.card, .formCard { background: var(--ink-800); border: 2.5px solid var(--ink-600); border-radius: 24px; padding: clamp(18px, 4vw, 28px); display: flex; flex-direction: column; gap: 16px; }
.formCard { background: #fff; color: #000; border-color: #000; }
.cardHeader { font: 800 18px var(--font-sans); }
.dayScroller { display: flex; gap: 8px; overflow-x: auto; padding: 4px 4px 8px; }
.dayBtn { flex: none; width: 68px; min-height: 84px; border-radius: 18px; border: 2.5px solid #000; background: #fff; color: #000; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; font-family: var(--font-sans); cursor: pointer; }
.dayBtnSelected { background: var(--lime-500); border-color: var(--lime-500); }
.dayBtnOff { background: transparent; border-color: var(--ink-600); color: var(--ink-500); cursor: not-allowed; }
.dayWd { font: 600 12px var(--font-sans); text-transform: uppercase; }
.dayNum { font: 900 26px var(--font-sans); }
.dayNote { font: 500 11px var(--font-sans); }
.slotsGrid { display: grid; grid-template-columns: repeat(auto-fill, minmax(104px, 1fr)); gap: 10px; }
.submitError { background: var(--danger-500); color: #fff; border-radius: 12px; padding: 10px 14px; font: 500 13px var(--font-sans); }
.confirmWrap { max-width: 640px; margin: 0 auto; display: flex; flex-direction: column; gap: 20px; padding: 0 clamp(20px, 4vw, 32px); }
.confirmTitle { margin: 0; font: 900 clamp(34px, 8vw, 56px)/1 var(--font-sans); }
.confirmLead { margin: 0; font: 300 17px/1.5 var(--font-sans); color: var(--ink-300); }
.confirmCard { background: #fff; color: #000; border: 2.5px solid #000; border-radius: 24px; overflow: hidden; }
.confirmCardHeader { background: var(--lime-500); padding: 18px 22px; display: flex; justify-content: space-between; font: 800 18px var(--font-sans); }
.confirmCardBody { padding: 22px; display: flex; flex-direction: column; gap: 16px; }
.confirmRow { display: flex; gap: 12px; align-items: flex-start; }
.confirmRowTitle { font: 700 17px var(--font-sans); }
```

- [ ] **Step 7: Run the test to verify it passes**

```bash
npm run test -- components/sections/BookingFlow.test.tsx
```

Expected: all 4 tests PASS.

- [ ] **Step 8: Wire `BookingFlow` into `app/page.tsx`**

```tsx
'use client';
import { useRef } from 'react';
import { Hero } from '@/components/sections/Hero';
import { Services } from '@/components/sections/Services';
import { BookingFlow } from '@/components/sections/BookingFlow';
import { Footer } from '@/components/ui/Footer';

export default function HomePage() {
  const agendaRef = useRef<HTMLDivElement>(null);
  const scrollToAgenda = () => agendaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  return (
    <main>
      <Hero onAgendaClick={scrollToAgenda} />
      <Services />
      <div ref={agendaRef} style={{ scrollMarginTop: 64 }}>
        <BookingFlow />
      </div>
      <Footer note="Clases virtuales 1-on-1 · A1 – C1 · TOEFL, IELTS, CELPIP, OET" />
    </main>
  );
}
```

- [ ] **Step 9: Manual end-to-end QA in the browser** — requires `npm run db:push` already run and at least one active row inserted via the admin API (Task 8) or directly in Neon's SQL editor.

```bash
npm run dev
```

Open `http://localhost:3000`, click "Agenda tu prueba gratis de 30 min", pick the day/time you activated, fill the form, submit. Expected: the confirmation screen appears with the right day/time, and a real email arrives (if `RESEND_API_KEY` is set) at both the test address and `ADMIN_NOTIFICATION_EMAIL`. Open a second tab and try to book the same exact slot — expect the "ya fue tomado" message. Stop the dev server once confirmed.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "Add BookingFlow UI wired to the availability and bookings APIs"
```

---

## Task 13: Admin UI (login page + dashboard)

**Files:**
- Create: `app/admin/login/page.tsx`
- Create: `app/admin/page.tsx`
- Create: `components/admin/ScheduleGrid.tsx`, `components/admin/ScheduleGrid.module.css`
- Create: `components/admin/BookingsList.tsx`, `components/admin/BookingsList.module.css`
- Test: `components/admin/ScheduleGrid.test.tsx`, `components/admin/BookingsList.test.tsx`, `app/admin/login/page.test.tsx`

**Interfaces:**
- Consumes: `GET/POST /api/admin/weekly-slots`, `GET /api/admin/bookings`, `POST /api/admin/bookings/:id/cancel` (Task 8), `POST /api/admin/login` (Task 7), `Button`/`Input` (Task 9), `fmtTime`/`fmtDayLabel` (Task 6).
- Produces: the complete admin experience — no later task depends on these.

- [ ] **Step 1: Write the failing test for `ScheduleGrid`**

```tsx
// components/admin/ScheduleGrid.test.tsx
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ScheduleGrid } from './ScheduleGrid';

beforeEach(() => vi.unstubAllGlobals());

describe('ScheduleGrid', () => {
  it('marks a slot active after toggling it on', async () => {
    let slots: Array<{ id: number; weekday: number; minuteOfDay: number; active: boolean }> = [];
    vi.stubGlobal('fetch', vi.fn((url: string, init?: RequestInit) => {
      if (init?.method === 'POST') {
        const body = JSON.parse(init.body as string);
        slots = [{ id: 1, ...body }];
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ ok: true }) } as Response);
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve(slots) } as Response);
    }));

    render(<ScheduleGrid />);
    const cell = await waitFor(() => screen.getAllByText('6:00 am')[0]);
    fireEvent.click(cell);

    await waitFor(() => expect(cell.className).toMatch(/cellActive/));
  });
});
```

- [ ] **Step 2: Write the failing test for `BookingsList`**

```tsx
// components/admin/BookingsList.test.tsx
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BookingsList } from './BookingsList';

beforeEach(() => vi.unstubAllGlobals());

const BOOKING = { id: 1, classDate: '2026-11-02', minuteOfDay: 360, name: 'Ana', email: 'ana@test.com', phone: '3001234567' };

describe('BookingsList', () => {
  it('shows "no hay reservas" when the list is empty', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve([]) } as Response)));
    render(<BookingsList />);
    await waitFor(() => expect(screen.getByText('No hay reservas próximas.')).toBeInTheDocument());
  });

  it('removes a booking from the list after cancelling it', async () => {
    let bookings = [BOOKING];
    vi.stubGlobal('fetch', vi.fn((url: string, init?: RequestInit) => {
      if (init?.method === 'POST') {
        bookings = [];
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ ok: true }) } as Response);
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve(bookings) } as Response);
    }));

    render(<BookingsList />);
    await waitFor(() => screen.getByText('Ana'));
    fireEvent.click(screen.getByText('Cancelar'));
    await waitFor(() => expect(screen.getByText('No hay reservas próximas.')).toBeInTheDocument());
  });
});
```

- [ ] **Step 3: Run both to verify they fail**

```bash
npm run test -- components/admin/ScheduleGrid.test.tsx components/admin/BookingsList.test.tsx
```

Expected: FAIL — modules not found.

- [ ] **Step 4: Implement `components/admin/ScheduleGrid.tsx` and `ScheduleGrid.module.css`**

```tsx
'use client';
import { useEffect, useState } from 'react';
import { fmtTime } from '@/lib/format';
import styles from './ScheduleGrid.module.css';

const WEEKDAY_SHORT = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const CANDIDATE_MINUTES = Array.from({ length: 17 }, (_, i) => 300 + i * 60); // 5:00 am .. 9:00 pm, hourly

type WeeklySlot = { id: number; weekday: number; minuteOfDay: number; active: boolean };

export function ScheduleGrid() {
  const [slots, setSlots] = useState<WeeklySlot[] | null>(null);

  async function load() {
    const res = await fetch('/api/admin/weekly-slots');
    setSlots(await res.json());
  }

  useEffect(() => { load(); }, []);

  if (!slots) return <p>Cargando horarios…</p>;

  const isActive = (weekday: number, minuteOfDay: number) =>
    slots.some((s) => s.weekday === weekday && s.minuteOfDay === minuteOfDay && s.active);

  async function toggle(weekday: number, minuteOfDay: number) {
    await fetch('/api/admin/weekly-slots', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ weekday, minuteOfDay, active: !isActive(weekday, minuteOfDay) }),
    });
    await load();
  }

  return (
    <div className={styles.wrap}>
      {WEEKDAY_SHORT.map((label, weekday) => (
        <div key={weekday} className={styles.row}>
          <span className={styles.rowLabel}>{label}</span>
          <div className={styles.cells}>
            {CANDIDATE_MINUTES.map((m) => {
              const active = isActive(weekday, m);
              return (
                <button
                  key={m}
                  onClick={() => toggle(weekday, m)}
                  className={[styles.cell, active ? styles.cellActive : ''].join(' ')}
                >
                  {fmtTime(m)}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
```

```css
/* components/admin/ScheduleGrid.module.css */
.wrap { display: flex; flex-direction: column; gap: 10px; }
.row { display: flex; align-items: center; gap: 12px; }
.rowLabel { width: 36px; font: 700 13px var(--font-sans); color: var(--ink-300); flex: none; }
.cells { display: flex; flex-wrap: wrap; gap: 6px; }
.cell { border: 1.5px solid var(--ink-600); background: transparent; color: var(--ink-300); border-radius: 10px; padding: 6px 10px; font: 500 12px var(--font-sans); cursor: pointer; }
.cellActive { background: var(--lime-500); color: #000; border-color: var(--lime-500); }
```

- [ ] **Step 5: Implement `components/admin/BookingsList.tsx` and `BookingsList.module.css`**

```tsx
'use client';
import { useEffect, useState } from 'react';
import { fmtDayLabel, fmtTime } from '@/lib/format';
import { Button } from '@/components/ui/Button';
import styles from './BookingsList.module.css';

type Booking = { id: number; classDate: string; minuteOfDay: number; name: string; email: string; phone: string };

export function BookingsList() {
  const [bookings, setBookings] = useState<Booking[] | null>(null);

  async function load() {
    const res = await fetch('/api/admin/bookings');
    setBookings(await res.json());
  }

  useEffect(() => { load(); }, []);

  async function cancel(id: number) {
    await fetch(`/api/admin/bookings/${id}/cancel`, { method: 'POST' });
    await load();
  }

  if (!bookings) return <p>Cargando reservas…</p>;
  if (bookings.length === 0) return <p className={styles.empty}>No hay reservas próximas.</p>;

  return (
    <div className={styles.list}>
      {bookings.map((b) => (
        <div key={b.id} className={styles.row}>
          <div>
            <div className={styles.name}>{b.name}</div>
            <div className={styles.meta}>{fmtDayLabel(b.classDate)} · {fmtTime(b.minuteOfDay)}</div>
            <div className={styles.meta}>{b.email} · {b.phone}</div>
          </div>
          <Button size="sm" variant="outline" onClick={() => cancel(b.id)}>Cancelar</Button>
        </div>
      ))}
    </div>
  );
}
```

```css
/* components/admin/BookingsList.module.css */
.list { display: flex; flex-direction: column; gap: 12px; }
.row { display: flex; align-items: center; justify-content: space-between; gap: 16px; border: 1.5px solid var(--ink-600); border-radius: 14px; padding: 14px 16px; }
.name { font: 700 15px var(--font-sans); }
.meta { font: 300 13px var(--font-sans); color: var(--ink-300); }
.empty { color: var(--ink-300); }
```

- [ ] **Step 6: Run the tests to verify they pass**

```bash
npm run test -- components/admin/ScheduleGrid.test.tsx components/admin/BookingsList.test.tsx
```

Expected: both tests PASS.

- [ ] **Step 7: Write the failing test for the login page**

```tsx
// app/admin/login/page.test.tsx
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const pushMock = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: pushMock }) }));

import AdminLoginPage from './page';

beforeEach(() => {
  vi.unstubAllGlobals();
  pushMock.mockClear();
});

describe('AdminLoginPage', () => {
  it('shows the server error message on a wrong password', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: false, json: () => Promise.resolve({ error: 'Contraseña incorrecta' }) } as Response)));
    render(<AdminLoginPage />);
    fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'wrong' } });
    fireEvent.click(screen.getByText('Entrar'));
    await waitFor(() => expect(screen.getByText('Contraseña incorrecta')).toBeInTheDocument());
    expect(pushMock).not.toHaveBeenCalled();
  });

  it('redirects to /admin on success', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ ok: true }) } as Response)));
    render(<AdminLoginPage />);
    fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'right' } });
    fireEvent.click(screen.getByText('Entrar'));
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/admin'));
  });
});
```

- [ ] **Step 8: Run it to verify it fails, then implement `app/admin/login/page.tsx`**

```bash
npm run test -- app/admin/login/page.test.tsx
```

Expected: FAIL — `./page` not found.

```tsx
// app/admin/login/page.tsx
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export default function AdminLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  async function submit() {
    setSending(true);
    setError(null);
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    const data = await res.json();
    setSending(false);
    if (!res.ok) {
      setError(data.error ?? 'Error inesperado');
      return;
    }
    router.push('/admin');
  }

  return (
    <main style={{ maxWidth: 360, margin: '96px auto', padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <h1 style={{ font: '900 28px var(--font-sans)' }}>Admin · The English Project</h1>
      {error ? <div style={{ color: 'var(--danger-500)' }}>{error}</div> : null}
      <Input label="Contraseña" type="password" value={password} onChange={setPassword} />
      <Button size="lg" fullWidth disabled={sending} onClick={submit}>Entrar</Button>
    </main>
  );
}
```

- [ ] **Step 9: Run the test to verify it passes**

```bash
npm run test -- app/admin/login/page.test.tsx
```

Expected: both tests PASS.

- [ ] **Step 10: Implement `app/admin/page.tsx`** (no dedicated test — thin composition of already-tested pieces, verified in Step 11)

```tsx
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ScheduleGrid } from '@/components/admin/ScheduleGrid';
import { BookingsList } from '@/components/admin/BookingsList';
import { Button } from '@/components/ui/Button';

export default function AdminPage() {
  const router = useRouter();
  const [tab, setTab] = useState<'schedule' | 'bookings'>('bookings');

  async function logout() {
    await fetch('/api/admin/logout', { method: 'POST' });
    router.push('/admin/login');
  }

  return (
    <main style={{ maxWidth: 900, margin: '0 auto', padding: '40px 20px', display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ font: '900 28px var(--font-sans)' }}>Admin · The English Project</h1>
        <Button size="sm" variant="outline" onClick={logout}>Salir</Button>
      </div>
      <div style={{ display: 'flex', gap: 12 }}>
        <Button size="sm" variant={tab === 'bookings' ? 'solid' : 'outline'} onClick={() => setTab('bookings')}>Reservas</Button>
        <Button size="sm" variant={tab === 'schedule' ? 'solid' : 'outline'} onClick={() => setTab('schedule')}>Horarios</Button>
      </div>
      {tab === 'bookings' ? <BookingsList /> : <ScheduleGrid />}
    </main>
  );
}
```

- [ ] **Step 11: Manual QA of the full admin flow**

```bash
npm run dev
```

Visit `http://localhost:3000/admin` — expect a redirect to `/admin/login` (middleware from Task 7). Log in with `ADMIN_PASSWORD` from `.env.local`. On the "Horarios" tab, toggle a few cells on; switch to "Reservas" and confirm any bookings made during Task 12's QA appear there with a working "Cancelar" button. Click "Salir" and confirm it redirects back to the login page and `/admin` is no longer reachable without logging in again. Stop the dev server once confirmed.

- [ ] **Step 12: Commit**

```bash
git add -A
git commit -m "Add admin login page and dashboard (schedule grid + bookings list)"
```

---

## Task 14: Account setup docs, deployment, and final QA

**Files:**
- Create: `README.md`

**Interfaces:**
- Consumes: nothing new — this task documents and deploys what Tasks 1–13 built.
- Produces: a deployed, publicly reachable site.

- [ ] **Step 1: Write `README.md`** with account creation and environment variable setup instructions

```markdown
# The English Project — setup

## 1. Create accounts (free tier is enough)
1. **Neon** (https://neon.tech) — create a project, copy its connection string into `DATABASE_URL` in `.env.local`. Create a second, separate Neon project (or a branch) for tests and put its connection string in `DATABASE_URL_TEST`.
2. **Resend** (https://resend.com) — create an account and an API key, put it in `RESEND_API_KEY`. Without a verified custom domain, leave `RESEND_FROM` unset — the app falls back to Resend's shared `onboarding@resend.dev` sender, which works with no setup. Once a real domain is attached to the project, verify it in Resend and set `RESEND_FROM` to an address on that domain.
3. **Vercel** (https://vercel.com) — create a project from this repository's git remote.

## 2. Environment variables
Copy `.env.example` to `.env.local` and fill in every value: `DATABASE_URL`, `DATABASE_URL_TEST`, `RESEND_API_KEY`, `ADMIN_NOTIFICATION_EMAIL` (who gets booking notifications — change any time without redeploying code), `ADMIN_PASSWORD` (the single admin password), `ADMIN_SESSION_SECRET` (generate with `openssl rand -hex 32`).

Set the same variables (except `DATABASE_URL_TEST`, which is dev/test-only) in the Vercel project's Settings → Environment Variables before deploying.

## 3. Database
```bash
npm run db:push
```
This creates `weekly_slots` and `bookings` (including the anti-double-booking index) in the database pointed to by `DATABASE_URL`.

## 4. Local development
```bash
npm install
npm run dev
```

## 5. Tests
```bash
npm run test
```
Tests that need a database are skipped automatically unless `DATABASE_URL_TEST` is set.

## 6. Deploy
```bash
npx vercel --prod
```
Or connect the git repository in the Vercel dashboard for automatic deploys on push. The site will be reachable at the `.vercel.app` URL Vercel assigns.
```

- [ ] **Step 2: Commit the README**

```bash
git add -A
git commit -m "Add setup and deployment README"
```

- [ ] **Step 3: Run the full test suite once more**

```bash
npm run test
```

Expected: every test file passes (DB-dependent ones pass if `DATABASE_URL_TEST` is set, or report skipped otherwise — neither case is a failure).

- [ ] **Step 4: Full manual QA pass in the browser** (after `npm run db:push` and setting at least one active weekly slot via `/admin`)

1. Visit `/` — hero, teacher byline, and the four service cards match the mockup's sections 01–02 visually (black background, lime accents, Poppins, hard black borders).
2. Click "Agenda tu prueba gratis de 30 min" — scrolls to the booking section.
3. Pick a day with available slots, pick a time, submit with an invalid email — see the inline "Revisa tu correo" error, no network request sent.
4. Fix the email, submit — see the confirmation screen with the right day/time, "Añadir a mi calendario" link opening a prefilled Google Calendar page, and "Escribirle a David" opening WhatsApp with a prefilled message to `+57 314 364 3282`.
5. Check the inbox for the booked email address — the confirmation email arrived. Check the inbox for `ADMIN_NOTIFICATION_EMAIL` — the notification email arrived.
6. Open the same booking URL in a second browser/incognito window, pick the exact same day+time, submit — see "Ese horario ya fue tomado, elige otro." and the slot now shows as booked.
7. Visit `/admin` while logged out — redirected to `/admin/login`. Log in with the wrong password — see "Contraseña incorrecta". Log in with the right one — reach the dashboard.
8. On "Reservas", cancel the booking made in step 4 — it disappears from the list, and that exact day+time becomes bookable again on `/`.
9. On "Horarios", toggle a slot off — reload `/` and confirm it no longer appears as available.
10. Click "Salir" — redirected to `/admin/login`, and `/admin` is unreachable again without logging back in.

- [ ] **Step 5: Deploy**

```bash
npx vercel --prod
```

Confirm the deployed URL serves the same site, with the same environment variables configured in the Vercel project settings (Step 2 of the README).

