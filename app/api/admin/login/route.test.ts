import { describe, it, expect } from 'vitest';
import { POST } from './route';

describe('POST /api/admin/login', () => {
  it('returns 400 when request body is not valid JSON', async () => {
    const request = new Request('http://localhost:3000/api/admin/login', {
      method: 'POST',
      body: '{not valid json',
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
    const json = await response.json() as { error?: string };
    expect(json.error).toBe('Datos inválidos');
  });

  it('returns 400 when request body is empty string', async () => {
    const request = new Request('http://localhost:3000/api/admin/login', {
      method: 'POST',
      body: '',
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
    const json = await response.json() as { error?: string };
    expect(json.error).toBe('Datos inválidos');
  });
});
