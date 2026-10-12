import { Resend } from 'resend';

export type EmailBookingParams = {
  name: string;
  email: string;
  phone: string;
  classDate: string;
  minuteOfDay: number;
  dayLabel: string;
  timeLabel: string;
  whatsappUrl: string;
};

function getClient(): Resend {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error('RESEND_API_KEY is not set.');
  return new Resend(key);
}

function getFromAddress(): string {
  // Falls back to Resend's shared test sender, which works with no domain
  // verification — swap in a verified address via RESEND_FROM once a real
  // domain is attached to the project (see README).
  //
  // Uses `||`, not `??`: .env.local commonly has a present-but-blank
  // `RESEND_FROM=` line (e.g. copied from .env.example and left unfilled),
  // which makes process.env.RESEND_FROM an empty string, not undefined —
  // `??` would keep that empty string instead of falling back, and Resend
  // rejects an empty `from` with a misleading "The domain is invalid" error
  // (confirmed live: every send failed with `from: ""` until this fix).
  return process.env.RESEND_FROM || 'The English Project <onboarding@resend.dev>';
}

const wrapper = (title: string, bodyHtml: string) => `
<div style="background:#000;color:#fff;font-family:Poppins,system-ui,sans-serif;padding:32px;">
  <div style="background:#CCFF00;color:#000;display:inline-block;padding:6px 10px;font-weight:900;transform:rotate(-2deg);">The English Project</div>
  <h1 style="font-weight:900;font-size:28px;margin:20px 0 8px;">${title}</h1>
  ${bodyHtml}
</div>`;

export async function sendBookingConfirmation(p: EmailBookingParams): Promise<void> {
  const html = wrapper('¡Tu prueba quedó agendada!', `
    <p style="font-weight:300;font-size:16px;">Nos vemos el <b>${p.dayLabel}</b>, de ${p.timeLabel}, hora de Colombia.</p>
    <p style="font-weight:300;font-size:16px;">Profesor: David E. García V. — el enlace de la videollamada llega por WhatsApp un día antes.</p>
    <p><a href="${p.whatsappUrl}" style="color:#CCFF00;">Escribirle a David por WhatsApp</a></p>
  `);
  try {
    const client = getClient();
    await client.emails.send({
      from: getFromAddress(),
      to: [p.email],
      subject: 'Tu prueba de inglés quedó agendada',
      html,
    });
  } catch (err) {
    console.error('sendBookingConfirmation failed', err);
  }
}

export async function sendAdminNotification(p: EmailBookingParams): Promise<void> {
  const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL;
  if (!adminEmail) {
    console.error('ADMIN_NOTIFICATION_EMAIL is not set; skipping admin notification.');
    return;
  }
  const html = wrapper('Nueva reserva', `
    <p style="font-weight:300;font-size:16px;"><b>${p.name}</b> reservó para el ${p.dayLabel}, ${p.timeLabel}.</p>
    <p style="font-weight:300;font-size:16px;">Correo: ${p.email}<br/>Teléfono/WhatsApp: ${p.phone}</p>
  `);
  try {
    const client = getClient();
    await client.emails.send({
      from: getFromAddress(),
      to: [adminEmail],
      subject: `Nueva reserva: ${p.name} — ${p.dayLabel}`,
      html,
    });
  } catch (err) {
    console.error('sendAdminNotification failed', err);
  }
}
