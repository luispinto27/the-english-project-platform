# The English Project — Platform Design

Date: 2026-10-11
Status: Approved for implementation planning

## 1. Purpose

Turn the existing design prototype (`/Users/luisfelipepintogomez/Developer/Design System/The English Project Platform/The English Project.dc.html`, a non-functional `x-dc` mockup export) into a real, deployed website for David E. García V.'s English tutoring business, "The English Project."

The site must:
- Present the business (hero, services) matching the mockup's visual design.
- Let visitors book a real free 30-minute trial class, with genuine conflict-free scheduling (no double-booking), backed by a database.
- Let David manage his weekly availability and view/cancel bookings through a password-protected admin panel.
- Send a confirmation email to the student and a notification email to David on every booking.

## 2. Source material

The mockup folder (`.../The English Project Platform/`) contains:
- `The English Project.dc.html` — the page structure/copy/logic (in a fake `x-dc` DSL), to be reimplemented as real React/Next.js — not used at runtime.
- `_ds/.../tokens/{colors,typography,spacing,fonts}.css` — real design tokens (CSS custom properties) to carry over as-is into the new project's global stylesheet.
- `assets/photos/*.png` — hero photography to reuse.
- `support.js`, `_ds_bundle.js` — the mockup's fake component runtime; **not reused**.

Visual identity: black background, lime accent (`--lime-500: #CCFF00`), Poppins font (black/extrabold weights for headings), thick black borders (2.5px) and hard offset shadows, slight rotation on badges/eyebrows — a bold, brutalist-leaning style. See the tokens files for the full palette/type scale/spacing scale; reuse them verbatim.

## 3. Tech stack

- **Framework:** Next.js 14 (App Router), TypeScript.
- **Database:** Postgres on Neon (serverless, pairs natively with Vercel), accessed via Drizzle ORM.
- **Email:** Resend.
- **Hosting:** Vercel, deployed to its default `.vercel.app` subdomain (no custom domain yet — can be attached later with no code changes).
- **Icons:** `@phosphor-icons/react`.
- **Testing:** Vitest for unit/integration tests.

Accounts (Neon, Resend, Vercel) must be created by the user; this project only needs the resulting API keys/connection strings, supplied as environment variables.

## 4. Data model

```
weekly_slots
  id            serial primary key
  weekday       smallint not null        -- 0=Sunday .. 6=Saturday
  minute_of_day smallint not null        -- minutes since midnight, e.g. 360 = 6:00am
  active        boolean not null default true
  unique(weekday, minute_of_day)

bookings
  id            serial primary key
  class_date    date not null            -- the specific calendar date booked
  minute_of_day smallint not null
  name          text not null
  email         text not null
  phone         text not null
  status        text not null default 'confirmed'   -- 'confirmed' | 'cancelled'
  created_at    timestamptz not null default now()
  unique(class_date, minute_of_day) where status = 'confirmed'
```

The partial unique index on `bookings (class_date, minute_of_day) WHERE status = 'confirmed'` is what prevents double-booking at the database level — the last line of defense even under concurrent requests. Cancelling a booking sets `status = 'cancelled'`, which frees the slot (it no longer counts against the unique index).

`weekly_slots` is the recurring template David edits in the admin panel (open/close a given weekday+time combination going forward). It replaces the mockup's hardcoded `HOURS` object.

## 5. Availability computation

For a requested date range (next N days, N configurable, default 14):
1. For each date in range, find its weekday and look up all `active = true` rows in `weekly_slots` for that weekday.
2. Subtract any `minute_of_day` that already has a `confirmed` booking on that exact `class_date`.
3. Return the remaining minutes as "available" slots for that date.

This computation is a pure function (`computeAvailability(weeklySlots, bookings, dateRange)`) so it can be unit tested without a database.

## 6. Public booking flow

- `GET /api/availability?days=14` — returns computed availability per day for the next 14 days (dates, weekday labels, and per-slot available/booked status), used to render the "pick a day" / "pick a time" UI.
- `POST /api/bookings` — body `{ classDate, minuteOfDay, name, email, phone }`.
  1. Validate input (name ≥ 2 chars, valid email, phone ≥ 7 digits) — same rules as the mockup.
  2. Verify `(weekday of classDate, minuteOfDay)` is an active `weekly_slots` entry.
  3. Insert into `bookings` inside a transaction relying on the partial unique index; if the insert fails on conflict, return `409` with an error the frontend maps to "ese horario ya fue tomado, elige otro" and triggers a re-fetch of `/api/availability`.
  4. On success: send the confirmation email (to the student) and the notification email (to `ADMIN_NOTIFICATION_EMAIL`) via Resend, then return the booking plus a prebuilt Google Calendar "add to calendar" URL and a prebuilt WhatsApp `wa.me/573143643282` deep link (same URL-building logic as the mockup's `gcalUrl`/`waUrl`).

The frontend booking UI (day picker → time picker → form → confirmation) reproduces the mockup's screens 03/04 as real React components and state (replacing the `x-dc` `sc-if`/`sc-for`/component-import template with actual JSX), calling the two endpoints above instead of faking state locally.

## 7. Admin panel

- `/admin/login` — single password field. Password is compared against `ADMIN_PASSWORD` (env var). On match, the server sets a signed, httpOnly session cookie (HMAC-signed with a server-only secret, short random session token — no user table, since there is exactly one admin).
- Middleware guards every `/admin/*` page and every `/api/admin/*` route: no valid session cookie → redirect to `/admin/login` (pages) or `401` (API).
- `/admin` — two tabs:
  - **Horarios:** a weekday × time-of-day grid of toggles reflecting `weekly_slots`; toggling calls `POST /api/admin/weekly-slots` to flip `active` (creating the row if it doesn't exist yet).
  - **Reservas:** a list of upcoming (`class_date >= today`, `status = 'confirmed'`) bookings with name/email/phone/date/time, each with a "Cancelar" button calling `POST /api/admin/bookings/:id/cancel` (sets `status = 'cancelled'`).

## 8. Email

Two Resend templates, styled consistently with the site (black background, lime accent, Poppins):
1. **Student confirmation** — sent to `booking.email`: date/time, David's name, the WhatsApp link, "see you then" copy.
2. **David notification** — sent to `ADMIN_NOTIFICATION_EMAIL` (default `luisfelipepint7@gmail.com`; David can take this over later by changing the env var in Vercel, no redeploy of code needed): student's name/email/phone and the booked date/time.

## 9. Design system translation

Rebuild the mockup's fake `TheEnglishProjectDesignSystem_149ad3` components as real, local React components under `components/ui/`:
- `Button` (variants: solid lime, outline; sizes sm/lg; optional left/right icon)
- `Badge` (outline/dark tones)
- `Input` (label, error, helper text — matches mockup's Input usage)
- `TimeSlot` (available/booked/selected states)
- `PhotoFrame` (framed photo with rounded corners + ratio, used in hero)
- `Highlight` (the lime text-highlight wrapper used in headlines)
- `Footer`
- Icons via `@phosphor-icons/react` (`fill`/`bold` weights, matching the icon names already used in the mockup: `chalkboard-teacher`, `chats-circle`, `exam`, `briefcase`, `asterisk`, `calendar-check`, `whatsapp-logo`, `check-circle`).

Global tokens (`app/globals.css`) import the four token files from the mockup's `_ds/tokens/` folder verbatim (colors, typography, spacing) plus the Google Fonts `@import` from `fonts.css`.

## 10. Error handling

- **Double-booking race:** handled by the DB partial unique index + `409` response, as above.
- **Form validation:** client-side mirrors mockup rules (name/email/phone), re-validated server-side; invalid submissions return `400` with field-level errors.
- **Admin auth failure:** wrong password → generic "contraseña incorrecta" message (no hint of correctness detail); no lockout/rate-limiting needed given this is a single-admin low-traffic site.
- **Email send failure:** booking still succeeds (already committed to DB) even if Resend fails — log the error server-side; the booking confirmation screen doesn't depend on email having been sent.

## 11. Testing

- Unit tests (Vitest) for `computeAvailability` — covers: no active slots, fully booked day, partially booked day, weekday boundaries.
- Integration test for `POST /api/bookings` against a test database — verifies a second concurrent booking for the same date+slot is rejected with `409`.
- Manual visual QA in a browser: compare the built hero/services/booking/admin screens against the mockup's layout and the extracted design tokens.

## 12. Out of scope (for this iteration)

- Live Google Calendar sync / OAuth with David's real calendar (explicitly deferred — the "Google Calendar integration" option was not chosen).
- Multiple admin users / role management.
- Custom domain setup (can be added later purely via Vercel dashboard, no code changes).
- Payment processing (the trial class is free; no payment flow exists in the mockup).
