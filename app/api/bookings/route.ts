import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db/client';
import { createBooking } from '@/lib/bookings';
import { sendBookingConfirmation, sendAdminNotification } from '@/lib/email';
import { fmtDayLabel, fmtTime } from '@/lib/format';
import { buildGcalUrl, buildWhatsappUrl } from '@/lib/booking-links';
import { todayInBogota, addDaysToIsoDate } from '@/lib/timezone';

// `days` ahead the booking window stays open. Deliberately generous relative to
// computeAvailability's own default of 14 days (the UI's picker only ever offers up to
// that many days ahead) — the API itself accepts an arbitrary `days` query param for
// /api/availability, so this just guards against obviously-bogus dates rather than
// second-guessing a legitimate wider window.
const MAX_DAYS_AHEAD = 60;

function isRealCalendarDate(isoDate: string): boolean {
  const [y, m, d] = isoDate.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  // An invalid day (e.g. 2026-02-31) rolls over into the next month instead of throwing —
  // Date silently normalizes it — so round-tripping the parts back out is how we detect it.
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}

const bodySchema = z.object({
  classDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida')
    .refine(isRealCalendarDate, 'Fecha inválida')
    .refine((v) => v >= todayInBogota(), 'Esa fecha ya pasó')
    .refine((v) => v <= addDaysToIsoDate(todayInBogota(), MAX_DAYS_AHEAD), 'Fecha fuera de rango'),
  minuteOfDay: z.number().int().min(0).max(1439),
  name: z.string().trim().min(2, 'Escribe tu nombre'),
  email: z.string().trim().email('Revisa tu correo'),
  phone: z.string().refine((v) => v.replace(/\D/g, '').length >= 7, 'Escribe un número válido'),
});

export async function POST(request: Request) {
  const json = await request.json().catch(() => null);
  if (json === null) {
    return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }, { status: 400 });
  }

  try {
    const result = await createBooking(db, parsed.data);
    if (!result.ok) {
      const status = result.error === 'SLOT_TAKEN' ? 409 : 400;
      const message = result.error === 'SLOT_TAKEN'
        ? 'Ese horario ya fue tomado, elige otro.'
        : 'Ese horario ya no está disponible, elige otro.';
      return NextResponse.json({ error: message }, { status });
    }

    const dayLabel = fmtDayLabel(result.booking.classDate);
    const timeLabel = `${fmtTime(result.booking.minuteOfDay)} – ${fmtTime(result.booking.minuteOfDay + 30)}`;
    const whatsappUrl = buildWhatsappUrl({ dayLabel, timeLabel: fmtTime(result.booking.minuteOfDay) });
    const gcalUrl = buildGcalUrl({ classDate: result.booking.classDate, minuteOfDay: result.booking.minuteOfDay });

    const emailParams = { ...result.booking, dayLabel, timeLabel, whatsappUrl };
    await Promise.all([sendBookingConfirmation(emailParams), sendAdminNotification(emailParams)]);

    return NextResponse.json({ booking: result.booking, dayLabel, timeLabel, whatsappUrl, gcalUrl }, { status: 201 });
  } catch (err) {
    console.error('POST /api/bookings failed', err);
    return NextResponse.json(
      { error: 'No pudimos completar tu reserva. Intenta de nuevo en un momento.' },
      { status: 500 }
    );
  }
}
