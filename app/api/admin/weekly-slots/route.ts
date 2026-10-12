import { NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { weeklySlots } from '@/lib/db/schema';

export async function GET() {
  try {
    const rows = await db.select().from(weeklySlots);
    return NextResponse.json(rows);
  } catch (err) {
    console.error('GET /api/admin/weekly-slots failed', err);
    return NextResponse.json(
      { error: 'No pudimos cargar los horarios. Intenta de nuevo en un momento.' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const { weekday, minuteOfDay, active } = await request.json();
  if (typeof weekday !== 'number' || typeof minuteOfDay !== 'number' || typeof active !== 'boolean') {
    return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });
  }

  try {
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
  } catch (err) {
    console.error('POST /api/admin/weekly-slots failed', err);
    return NextResponse.json(
      { error: 'No pudimos guardar el horario. Intenta de nuevo en un momento.' },
      { status: 500 }
    );
  }
}
