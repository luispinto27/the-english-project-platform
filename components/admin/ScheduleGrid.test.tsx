// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ScheduleGrid } from './ScheduleGrid';

beforeEach(() => vi.unstubAllGlobals());

describe('ScheduleGrid', () => {
  it('marks a slot active after toggling it on', async () => {
    let slots: Array<{ id: number; weekday: number; minuteOfDay: number; active: boolean }> = [];
    vi.stubGlobal('fetch', vi.fn((url: string, init?: RequestInit) => {
      if (init?.method === 'POST') {
        const body = JSON.parse(init.body as string);
        slots = [{ id: 1, ...body }];
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ ok: true }) } as Response);
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve(slots) } as Response);
    }));

    render(<ScheduleGrid />);
    const cell = await waitFor(() => screen.getAllByText('6:00 am')[0]);
    fireEvent.click(cell);

    await waitFor(() => expect(cell.className).toMatch(/cellActive/));
  });

  it('shows an error message instead of being stuck loading when the weekly-slots GET fails', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ error: 'boom' }),
    } as Response)));
    render(<ScheduleGrid />);

    await waitFor(() => expect(screen.getByText('No pudimos cargar los horarios. Intenta de nuevo en un momento.')).toBeInTheDocument());
    expect(screen.queryByText('Cargando horarios…')).not.toBeInTheDocument();
  });
});
