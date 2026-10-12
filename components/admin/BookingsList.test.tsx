// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BookingsList } from './BookingsList';

beforeEach(() => vi.unstubAllGlobals());

const BOOKING = { id: 1, classDate: '2026-11-02', minuteOfDay: 360, name: 'Ana', email: 'ana@test.com', phone: '3001234567' };

describe('BookingsList', () => {
  it('shows "no hay reservas" when the list is empty', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve([]) } as Response)));
    render(<BookingsList />);
    await waitFor(() => expect(screen.getByText('No hay reservas próximas.')).toBeInTheDocument());
  });

  it('removes a booking from the list after cancelling it', async () => {
    let bookings = [BOOKING];
    vi.stubGlobal('fetch', vi.fn((url: string, init?: RequestInit) => {
      if (init?.method === 'POST') {
        bookings = [];
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ ok: true }) } as Response);
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve(bookings) } as Response);
    }));

    render(<BookingsList />);
    await waitFor(() => screen.getByText('Ana'));
    fireEvent.click(screen.getByText('Cancelar'));
    await waitFor(() => expect(screen.getByText('No hay reservas próximas.')).toBeInTheDocument());
  });

  it('shows an error message instead of being stuck loading when the bookings GET fails', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ error: 'boom' }),
    } as Response)));
    render(<BookingsList />);

    await waitFor(() => expect(screen.getByText('No pudimos cargar las reservas. Intenta de nuevo en un momento.')).toBeInTheDocument());
    expect(screen.queryByText('Cargando reservas…')).not.toBeInTheDocument();
  });

  it('shows an error message and keeps the booking when the cancel POST fails', async () => {
    const fetchMock = vi.fn((url: string, init?: RequestInit) => {
      if (init?.method === 'POST') {
        return Promise.resolve({ ok: false, status: 500, json: () => Promise.resolve({ error: 'boom' }) } as Response);
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve([BOOKING]) } as Response);
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<BookingsList />);
    await waitFor(() => screen.getByText('Ana'));
    fireEvent.click(screen.getByText('Cancelar'));

    await waitFor(() => expect(screen.getByText('No pudimos cancelar la reserva. Intenta de nuevo en un momento.')).toBeInTheDocument());
    // Only the initial GET ran; the failed POST must not trigger a reload.
    expect(fetchMock.mock.calls.filter(([, init]) => !init || init.method !== 'POST')).toHaveLength(1);
  });
});
