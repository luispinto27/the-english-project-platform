const WEEKDAYS_LONG = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

export function fmtTime(minuteOfDay: number): string {
  const h = Math.floor(minuteOfDay / 60);
  const mm = String(minuteOfDay % 60).padStart(2, '0');
  if (h === 12 && minuteOfDay % 60 === 0) return '12:00 m';
  const h12 = h % 12 || 12;
  return `${h12}:${mm} ${h < 12 ? 'am' : 'pm'}`;
}

export function fmtDayLabel(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  const date = new Date(y, m - 1, d, 12);
  return `${WEEKDAYS_LONG[date.getDay()]}, ${date.getDate()} de ${MONTHS[date.getMonth()]}`;
}
