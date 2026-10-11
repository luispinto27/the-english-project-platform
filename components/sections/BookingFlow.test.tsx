// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BookingFlow } from './BookingFlow';

const AVAILABILITY = [
  { date: '2026-11-02', weekday: 1, slots: [{ minuteOfDay: 360, status: 'available' }] },
  { date: '2026-11-03', weekday: 2, slots: [] },
];

function mockFetchSequence(responses: Array<{ status: number; body: unknown }>) {
  let call = 0;
  vi.stubGlobal('fetch', vi.fn(() => {
    const r = responses[Math.min(call, responses.length - 1)];
    call += 1;
    return Promise.resolve({
      ok: r.status >= 200 && r.status < 300,
      status: r.status,
      json: () => Promise.resolve(r.body),
    } as Response);
  }));
}

beforeEach(() => {
  vi.unstubAllGlobals();
});

describe('BookingFlow', () => {
  it('loads availability and lets the user pick the only open day', async () => {
    mockFetchSequence([{ status: 200, body: AVAILABILITY }]);
    render(<BookingFlow />);
    await waitFor(() => expect(screen.getByText('6:00 am')).toBeInTheDocument());
  });

  it('keeps the submit button disabled until a slot is chosen and the form is valid, then submits', async () => {
    mockFetchSequence([
      { status: 200, body: AVAILABILITY },
      { status: 201, body: { booking: { id: 1, classDate: '2026-11-02', minuteOfDay: 360, name: 'Ana', email: 'ana@test.com', phone: '3001234567' }, dayLabel: 'lunes, 2 de noviembre', timeLabel: '6:00 am – 6:30 am', whatsappUrl: 'https://wa.me/573143643282', gcalUrl: 'https://calendar.google.com/x' } },
    ]);
    render(<BookingFlow />);
    await waitFor(() => screen.getByText('6:00 am'));

    fireEvent.click(screen.getByText('6:00 am'));
    fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: 'Ana' } });
    fireEvent.change(screen.getByLabelText('Correo'), { target: { value: 'ana@test.com' } });
    fireEvent.change(screen.getByLabelText('Teléfono / WhatsApp'), { target: { value: '3001234567' } });

    fireEvent.click(screen.getByText(/^Agendar/));

    await waitFor(() => expect(screen.getByText(/¡Listo, Ana!/)).toBeInTheDocument());
  });

  it('shows field errors instead of submitting when the form is invalid', async () => {
    const fetchSpy = vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve(AVAILABILITY) } as Response));
    vi.stubGlobal('fetch', fetchSpy);
    render(<BookingFlow />);
    await waitFor(() => screen.getByText('6:00 am'));

    fireEvent.click(screen.getByText('6:00 am'));
    fireEvent.change(screen.getByLabelText('Correo'), { target: { value: 'not-an-email' } });
    fireEvent.click(screen.getByText(/^Agendar/));

    expect(await screen.findByText('Escribe tu nombre')).toBeInTheDocument();
    expect(screen.getByText('Revisa tu correo')).toBeInTheDocument();
    expect(screen.getByText('Escribe un número válido')).toBeInTheDocument();
    expect(fetchSpy).toHaveBeenCalledTimes(1); // only the initial availability GET — no POST attempted
  });

  it('shows a retry message and re-fetches availability when the slot was just taken (409)', async () => {
    mockFetchSequence([
      { status: 200, body: AVAILABILITY },
      { status: 409, body: { error: 'Ese horario ya fue tomado, elige otro.' } },
      { status: 200, body: [{ date: '2026-11-02', weekday: 1, slots: [{ minuteOfDay: 360, status: 'booked' }] }] },
    ]);
    render(<BookingFlow />);
    await waitFor(() => screen.getByText('6:00 am'));

    fireEvent.click(screen.getByText('6:00 am'));
    fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: 'Ana' } });
    fireEvent.change(screen.getByLabelText('Correo'), { target: { value: 'ana@test.com' } });
    fireEvent.change(screen.getByLabelText('Teléfono / WhatsApp'), { target: { value: '3001234567' } });
    fireEvent.click(screen.getByText(/^Agendar/));

    await waitFor(() => expect(screen.getByText('Ese horario ya fue tomado, elige otro.')).toBeInTheDocument());
  });

  it('shows an error state with a retry option instead of being stuck loading when the availability GET fails', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ error: 'boom' }),
    } as Response)));
    render(<BookingFlow />);

    await waitFor(() => expect(screen.getByText('boom')).toBeInTheDocument());
    expect(screen.queryByText('Cargando disponibilidad…')).not.toBeInTheDocument();
    expect(screen.getByText('Reintentar')).toBeInTheDocument();
  });

  it('returns the submit button to normal and shows a fallback error when POST fails with a bodyless 500', async () => {
    let call = 0;
    vi.stubGlobal('fetch', vi.fn(() => {
      call += 1;
      if (call === 1) {
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(AVAILABILITY) } as Response);
      }
      if (call === 2) {
        // Bodyless 500: res.json() itself throws (no valid JSON body).
        return Promise.resolve({
          ok: false,
          status: 500,
          json: () => Promise.reject(new SyntaxError('Unexpected end of JSON input')),
        } as Response);
      }
      // Re-fetch of availability after the failed submit.
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(AVAILABILITY) } as Response);
    }));
    render(<BookingFlow />);
    await waitFor(() => screen.getByText('6:00 am'));

    fireEvent.click(screen.getByText('6:00 am'));
    fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: 'Ana' } });
    fireEvent.change(screen.getByLabelText('Correo'), { target: { value: 'ana@test.com' } });
    fireEvent.change(screen.getByLabelText('Teléfono / WhatsApp'), { target: { value: '3001234567' } });
    fireEvent.click(screen.getByText(/^Agendar/));

    await waitFor(() => expect(screen.getByText('Error inesperado, intenta de nuevo.')).toBeInTheDocument());
    expect(screen.queryByText('Agendando…')).not.toBeInTheDocument();
    expect(screen.getByText('Elige un horario')).toBeInTheDocument();
  });
});
