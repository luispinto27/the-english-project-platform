function stamp(isoDate: string, minuteOfDay: number): string {
  const h = String(Math.floor(minuteOfDay / 60)).padStart(2, '0');
  const mm = String(minuteOfDay % 60).padStart(2, '0');
  return `${isoDate.replace(/-/g, '')}T${h}${mm}00`;
}

export function buildGcalUrl(p: { classDate: string; minuteOfDay: number }): string {
  const start = stamp(p.classDate, p.minuteOfDay);
  const end = stamp(p.classDate, p.minuteOfDay + 30);
  const text = encodeURIComponent('Prueba de inglés · The English Project');
  const details = encodeURIComponent('Sesión de prueba 1-on-1 con David E. Garcia V.');
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${start}/${end}&ctz=America/Bogota&details=${details}`;
}

export function buildWhatsappUrl(p: { dayLabel: string; timeLabel: string }): string {
  const text = encodeURIComponent(`¡Hola David! Agendé una prueba para el ${p.dayLabel} a las ${p.timeLabel}.`);
  return `https://wa.me/573143643282?text=${text}`;
}
