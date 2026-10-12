// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const pushMock = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: pushMock }) }));

import AdminLoginPage from './page';

beforeEach(() => {
  vi.unstubAllGlobals();
  pushMock.mockClear();
});

describe('AdminLoginPage', () => {
  it('shows the server error message on a wrong password', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: false, json: () => Promise.resolve({ error: 'Contraseña incorrecta' }) } as Response)));
    render(<AdminLoginPage />);
    fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'wrong' } });
    fireEvent.click(screen.getByText('Entrar'));
    await waitFor(() => expect(screen.getByText('Contraseña incorrecta')).toBeInTheDocument());
    expect(pushMock).not.toHaveBeenCalled();
  });

  it('redirects to /admin on success', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ ok: true }) } as Response)));
    render(<AdminLoginPage />);
    fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'right' } });
    fireEvent.click(screen.getByText('Entrar'));
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/admin'));
  });
});
