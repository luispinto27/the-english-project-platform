import { describe, it, expect } from 'vitest';
import { createSessionToken, verifySessionToken } from './auth';

const SECRET = 'test-secret';

describe('session token', () => {
  it('verifies a token it just created', async () => {
    const token = await createSessionToken(SECRET, new Date('2026-11-02T12:00:00Z'));
    expect(await verifySessionToken(token, SECRET, new Date('2026-11-02T12:05:00Z'))).toBe(true);
  });

  it('rejects a token signed with a different secret', async () => {
    const token = await createSessionToken('other-secret', new Date('2026-11-02T12:00:00Z'));
    expect(await verifySessionToken(token, SECRET, new Date('2026-11-02T12:05:00Z'))).toBe(false);
  });

  it('rejects a tampered token', async () => {
    const token = await createSessionToken(SECRET, new Date('2026-11-02T12:00:00Z'));
    const tampered = token.slice(0, -1) + (token.slice(-1) === 'a' ? 'b' : 'a');
    expect(await verifySessionToken(tampered, SECRET, new Date('2026-11-02T12:05:00Z'))).toBe(false);
  });

  it('rejects an expired token (default lifetime is 7 days)', async () => {
    const token = await createSessionToken(SECRET, new Date('2026-11-02T12:00:00Z'));
    expect(await verifySessionToken(token, SECRET, new Date('2026-11-10T12:00:01Z'))).toBe(false);
  });

  it('rejects a malformed token', async () => {
    expect(await verifySessionToken('not-a-real-token', SECRET)).toBe(false);
  });
});
