import { NextResponse } from 'next/server';
import { and, eq, gte } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { bookings } from '@/lib/db/schema';
import { todayInBogota } from '@/lib/timezone';

// Without `dynamic`, Next.js statically optimizes this route at build time (it's the
// only GET-only handler in the app with no request params and no sibling POST in the
// same file — see app/api/admin/weekly-slots/route.ts, which has both and is correctly
// left dynamic). A statically-optimized response would freeze the admin bookings list
// to whatever was in the database at build time, never reflecting real reservations.
//
// `dynamic` alone isn't enough, though: the neon-http driver issues its queries via
// plain `fetch()` under the hood, and Next.js's Data Cache can still cache that
// *individual* fetch indefinitely (confirmed live — a cancelled booking kept coming
// back as "confirmed" on refetch within the same server lifetime even with `dynamic`
// set). `fetchCache = 'force-no-store'` disables that cache for every fetch this route
// makes, regardless of what the driver requests.
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export async function GET() {
  // Must be "today" in America/Bogota, not the server's own local/UTC date — on Vercel
  // the server runs in UTC, which is a full day ahead of Bogota for part of the evening/
  // night. Using raw UTC here would incorrectly exclude bookings scheduled for later
  // tonight (Bogota time) from the "upcoming" list.
  const today = todayInBogota();
  try {
    const rows = await db
      .select()
      .from(bookings)
      .where(and(eq(bookings.status, 'confirmed'), gte(bookings.classDate, today)))
      .orderBy(bookings.classDate, bookings.minuteOfDay);
    return NextResponse.json(rows);
  } catch (err) {
    console.error('GET /api/admin/bookings failed', err);
    return NextResponse.json(
      { error: 'No pudimos cargar las reservas. Intenta de nuevo en un momento.' },
      { status: 500 }
    );
  }
}
