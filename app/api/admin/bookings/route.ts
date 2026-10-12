import { NextResponse } from 'next/server';
import { and, eq, gte } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { bookings } from '@/lib/db/schema';

export async function GET() {
  const today = new Date().toISOString().slice(0, 10);
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
