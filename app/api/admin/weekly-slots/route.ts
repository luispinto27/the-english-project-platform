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
