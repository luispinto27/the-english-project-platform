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
