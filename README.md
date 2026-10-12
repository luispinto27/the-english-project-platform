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
npx vercel login
```
One-time, interactive: logs the Vercel CLI into your real Vercel account (opens a browser or email-code flow). Needed before `vercel --prod` will work from a terminal that hasn't authenticated before.

```bash
npx vercel --prod
```
Or connect the git repository in the Vercel dashboard for automatic deploys on push. The site will be reachable at the `.vercel.app` URL Vercel assigns.

Make sure the environment variables from Step 2 are set in the Vercel project (Settings → Environment Variables) before running either path — the build and the deployed app both read them at runtime.

## 7. Manual QA checklist (run this after a real deploy, with real Neon/Resend credentials)

This checklist exercises the whole booking flow end to end. It needs a real database with at least one active weekly slot (set via `/admin` after `npm run db:push`) and a real Resend account to receive email — **it cannot be fully completed against a project with placeholder or missing credentials.** Re-run it in full against the real deployment before considering the site launched.

1. Visit `/` — hero, teacher byline, and the four service cards match the mockup's sections 01–02 visually (black background, lime accents, Poppins, hard black borders).
2. Click "Agenda tu prueba gratis de 30 min" — scrolls to the booking section.
3. Pick a day with available slots, pick a time, submit with an invalid email — see the inline "Revisa tu correo" error, no network request sent.
4. Fix the email, submit — see the confirmation screen with the right day/time, "Añadir a mi calendario" link opening a prefilled Google Calendar page, and "Escribirle a David" opening WhatsApp with a prefilled message to `+57 314 364 3282`.
5. Check the inbox for the booked email address — the confirmation email arrived. Check the inbox for `ADMIN_NOTIFICATION_EMAIL` — the notification email arrived. *(Requires a real Resend account — not verifiable without one.)*
6. Open the same booking URL in a second browser/incognito window, pick the exact same day+time, submit — see "Ese horario ya fue tomado, elige otro." and the slot now shows as booked. *(Requires a real database.)*
7. Visit `/admin` while logged out — redirected to `/admin/login`. Log in with the wrong password — see "Contraseña incorrecta". Log in with the right one — reach the dashboard.
8. On "Reservas", cancel the booking made in step 4 — it disappears from the list, and that exact day+time becomes bookable again on `/`. *(Requires a real database.)*
9. On "Horarios", toggle a slot off — reload `/` and confirm it no longer appears as available. *(Requires a real database.)*
10. Click "Salir" — redirected to `/admin/login`, and `/admin` is unreachable again without logging back in.
