// The app's business timezone. The teacher and every student are in Colombia, so "today"
// and "now" for booking purposes must always be computed in America/Bogota (UTC-5, no DST),
// never in the server's own local/UTC time — on Vercel the server runs in UTC, which drifts
// a full calendar day ahead of Bogota for part of the evening/night (Bogota 19:00–23:59 is
// already the next UTC calendar day).
const BOGOTA_TZ = 'America/Bogota';

/**
 * Returns the current (or given) instant's calendar date in America/Bogota, as an
 * ISO `YYYY-MM-DD` string. `en-CA` is used purely because that locale's date formatting
 * happens to already be `YYYY-MM-DD` — no calendar/locale meaning beyond that.
 */
export function todayInBogota(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: BOGOTA_TZ }).format(date);
}

/**
 * Adds `days` (positive or negative) to an ISO `YYYY-MM-DD` date string and returns the
 * result as an ISO date string. Pure calendar-day arithmetic — not timezone-aware itself,
 * so always feed it a date string that is already anchored to the right timezone (e.g. one
 * produced by `todayInBogota`).
 */
export function addDaysToIsoDate(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  // Noon avoids any DST-adjacent midnight edge cases in the environment's local time;
  // irrelevant for Bogota (no DST) but keeps this helper safe to reuse elsewhere.
  const date = new Date(y, m - 1, d, 12);
  date.setDate(date.getDate() + days);
  const yy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}
