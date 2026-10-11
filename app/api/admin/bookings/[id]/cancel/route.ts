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
