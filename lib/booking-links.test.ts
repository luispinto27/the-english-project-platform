import { describe, it, expect } from 'vitest';
import { buildGcalUrl, buildWhatsappUrl } from './booking-links';

describe('buildGcalUrl', () => {
  it('builds a 30-minute Google Calendar template URL for the booked slot', () => {
    const url = buildGcalUrl({ classDate: '2026-11-02', minuteOfDay: 360 });
    expect(url).toContain('calendar.google.com/calendar/render');
    expect(url).toContain('20261102T060000');
    expect(url).toContain('20261102T063000');
  });
});

describe('buildWhatsappUrl', () => {
  it('builds a wa.me link to David with the day and time in the message', () => {
    const url = buildWhatsappUrl({ dayLabel: 'lunes, 2 de noviembre', timeLabel: '6:00 am' });
    expect(url).toContain('https://wa.me/573143643282');
    expect(decodeURIComponent(url)).toContain('lunes, 2 de noviembre');
  });
});
