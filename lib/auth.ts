import { createHmac, timingSafeEqual } from 'crypto';

export const ADMIN_SESSION_COOKIE = 'admin_session';
const SESSION_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;

function sign(value: string, secret: string): string {
  return createHmac('sha256', secret).update(value).digest('hex');
}

export function createSessionToken(secret: string, now: Date = new Date()): string {
  const expires = now.getTime() + SESSION_LIFETIME_MS;
  const payload = `admin.${expires}`;
  return `${payload}.${sign(payload, secret)}`;
}

export function verifySessionToken(token: string, secret: string, now: Date = new Date()): boolean {
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  const [tag, expiresStr, signature] = parts;
  if (tag !== 'admin') return false;
  const payload = `${tag}.${expiresStr}`;
  const expected = sign(payload, secret);

  const a = Buffer.from(signature, 'hex');
  const b = Buffer.from(expected, 'hex');
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;

  const expires = Number(expiresStr);
  if (!Number.isFinite(expires) || now.getTime() > expires) return false;

  return true;
}
