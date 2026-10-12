import { NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { weeklySlots, bookings } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { computeAvailability } from '@/lib/availability';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rawDays = Number(searchParams.get('days') ?? '14');
  const days = Number.isFinite(rawDays) ? Math.min(Math.max(rawDays, 1), 60) : 14;

  try {
    const slots = await db.select().from(weeklySlots);
    const confirmed = await db
      .select({ classDate: bookings.classDate, minuteOfDay: bookings.minuteOfDay })
      .from(bookings)
      .where(eq(bookings.status, 'confirmed'));

    const result = computeAvailability(slots, confirmed, { days });
    return NextResponse.json(result);
  } catch (err) {
    console.error('GET /api/availability failed', err);
    return NextResponse.json(
      { error: 'No pudimos cargar la disponibilidad. Intenta de nuevo en un momento.' },
      { status: 500 }
    );
  }
}
