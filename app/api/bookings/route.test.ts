import { describe, it, expect, vi } from 'vitest';
import { POST } from './route';

// Mock dependencies
vi.mock('@/lib/db/client', () => ({}));
vi.mock('@/lib/bookings', () => ({}));
vi.mock('@/lib/email', () => ({
  sendBookingConfirmation: vi.fn(),
  sendAdminNotification: vi.fn(),
}));
vi.mock('@/lib/format', () => ({}));
vi.mock('@/lib/booking-links', () => ({}));

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
});
