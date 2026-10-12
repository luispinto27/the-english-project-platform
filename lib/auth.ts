export const ADMIN_SESSION_COOKIE = 'admin_session';
const SESSION_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

function bytesToHex(bytes: ArrayBuffer): string {
  return Array.from(new Uint8Array(bytes))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function hexToBytes(hex: string): Uint8Array | null {
  if (hex.length % 2 !== 0 || !/^[0-9a-f]+$/i.test(hex)) return null;
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return out;
}

async function sign(value: string, secret: string): Promise<string> {
  const key = await hmacKey(secret);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value));
  return bytesToHex(sig);
}

export async function createSessionToken(secret: string, now: Date = new Date()): Promise<string> {
  const expires = now.getTime() + SESSION_LIFETIME_MS;
  const payload = `admin.${expires}`;
  return `${payload}.${await sign(payload, secret)}`;
}

export async function verifySessionToken(token: string, secret: string, now: Date = new Date()): Promise<boolean> {
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  const [tag, expiresStr, signatureHex] = parts;
  if (tag !== 'admin') return false;
  const payload = `${tag}.${expiresStr}`;

  const signatureBytes = hexToBytes(signatureHex);
  if (!signatureBytes) return false;

  const key = await hmacKey(secret);
  const valid = await crypto.subtle.verify(
    'HMAC',
    key,
    signatureBytes as BufferSource,
    new TextEncoder().encode(payload)
  );
  if (!valid) return false;

  const expires = Number(expiresStr);
  if (!Number.isFinite(expires) || now.getTime() > expires) return false;

  return true;
}
