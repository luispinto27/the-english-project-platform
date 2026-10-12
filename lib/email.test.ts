import { describe, it, expect, vi, beforeEach } from 'vitest';

const sendMock = vi.fn().mockResolvedValue({ data: { id: 'test' }, error: null });
vi.mock('resend', () => ({
  Resend: class {
    emails = { send: sendMock };
  },
}));

import { sendBookingConfirmation, sendAdminNotification } from './email';

const params = {
  name: 'Ana', email: 'ana@test.com', phone: '3001234567',
  classDate: '2026-11-02', minuteOfDay: 360,
  dayLabel: 'lunes, 2 de noviembre', timeLabel: '6:00 am – 6:30 am',
  whatsappUrl: 'https://wa.me/573143643282?text=hola',
};

beforeEach(() => {
  sendMock.mockClear();
  process.env.RESEND_API_KEY = 'test-key';
  process.env.ADMIN_NOTIFICATION_EMAIL = 'luisfelipepint7@gmail.com';
});

describe('sendBookingConfirmation', () => {
  it('sends to the student email with the day/time in the body', async () => {
    await sendBookingConfirmation(params);
    expect(sendMock).toHaveBeenCalledTimes(1);
    const call = sendMock.mock.calls[0][0];
    expect(call.to).toEqual(['ana@test.com']);
    expect(call.html).toContain('lunes, 2 de noviembre');
    expect(call.html).toContain('6:00 am – 6:30 am');
  });

  it('does not throw if Resend fails, so the booking still succeeds', async () => {
    sendMock.mockRejectedValueOnce(new Error('network down'));
    await expect(sendBookingConfirmation(params)).resolves.toBeUndefined();
  });

  it('logs and does not throw when Resend resolves with an API-level error (v6 does not reject for this)', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    sendMock.mockResolvedValueOnce({ data: null, error: { name: 'validation_error', message: 'Invalid `from` field' } });

    await expect(sendBookingConfirmation(params)).resolves.toBeUndefined();

    expect(errorSpy).toHaveBeenCalledWith(
      'sendBookingConfirmation failed',
      expect.objectContaining({ message: 'Invalid `from` field' })
    );
    errorSpy.mockRestore();
  });
});

describe('sendAdminNotification', () => {
  it('sends to ADMIN_NOTIFICATION_EMAIL with the student contact details', async () => {
    await sendAdminNotification(params);
    const call = sendMock.mock.calls[0][0];
    expect(call.to).toEqual(['luisfelipepint7@gmail.com']);
    expect(call.html).toContain('Ana');
    expect(call.html).toContain('3001234567');
  });

  it('logs and does not throw when Resend resolves with an API-level error (v6 does not reject for this)', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    sendMock.mockResolvedValueOnce({ data: null, error: { name: 'validation_error', message: 'Invalid `from` field' } });

    await expect(sendAdminNotification(params)).resolves.toBeUndefined();

    expect(errorSpy).toHaveBeenCalledWith(
      'sendAdminNotification failed',
      expect.objectContaining({ message: 'Invalid `from` field' })
    );
    errorSpy.mockRestore();
  });
});
