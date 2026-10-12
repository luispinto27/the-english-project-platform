import { describe, it, expect, vi } from 'vitest';
import { POST } from './route';
import { todayInBogota, addDaysToIsoDate } from '@/lib/timezone';

// Mock dependencies
vi.mock('@/lib/db/client', () => ({}));
vi.mock('@/lib/bookings', () => ({}));
vi.mock('@/lib/email', () => ({
  sendBookingConfirmation: vi.fn(),
  sendAdminNotification: vi.fn(),
}));
vi.mock('@/lib/format', () => ({}));
vi.mock('@/lib/booking-links', () => ({}));

const validBodyFields = {
  minuteOfDay: 360,
  name: 'Ana',
  email: 'ana@test.com',
  phone: '3001234567',
};

async function postBooking(classDate: string) {
  const request = new Request('http://localhost:3000/api/bookings', {
    method: 'POST',
    body: JSON.stringify({ classDate, ...validBodyFields }),
  });
  return POST(request);
}

describe('POST /api/bookings', () => {
  it('returns 400 when request body is not valid JSON', async () => {
    const request = new Request('http://localhost:3000/api/bookings', {
      method: 'POST',
      body: '{not valid json',
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
    const json = await response.json() as { error?: string };
    expect(json.error).toBe('Datos inválidos');
  });

  it('returns 400 when request body is empty string', async () => {
    const request = new Request('http://localhost:3000/api/bookings', {
      method: 'POST',
      body: '',
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
    const json = await response.json() as { error?: string };
    expect(json.error).toBe('Datos inválidos');
  });

  it('returns 400 for a classDate that is not a real calendar date (e.g. Feb 31)', async () => {
    const response = await postBooking('2026-02-31');
    expect(response.status).toBe(400);
    const json = await response.json() as { error?: string };
    expect(json.error).toBe('Fecha inválida');
  });

  it('returns 400 for a classDate in the past (relative to Bogota "today")', async () => {
    const yesterday = addDaysToIsoDate(todayInBogota(), -1);
    const response = await postBooking(yesterday);
    expect(response.status).toBe(400);
    const json = await response.json() as { error?: string };
    expect(json.error).toBe('Esa fecha ya pasó');
  });

  it('returns 400 for a classDate far beyond the booking window', async () => {
    const tooFar = addDaysToIsoDate(todayInBogota(), 61);
    const response = await postBooking(tooFar);
    expect(response.status).toBe(400);
    const json = await response.json() as { error?: string };
    expect(json.error).toBe('Fecha fuera de rango');
  });
});
