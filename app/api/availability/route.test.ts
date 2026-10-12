import { describe, it, expect, vi } from 'vitest';
import { GET } from './route';

vi.mock('@/lib/db/client', () => ({ db: {} }));
vi.mock('@/lib/db/schema', () => ({ weeklySlots: {}, bookings: {} }));

const { computeAvailabilityMock } = vi.hoisted(() => ({
  computeAvailabilityMock: vi.fn().mockReturnValue([]),
}));
vi.mock('@/lib/availability', () => ({
  computeAvailability: computeAvailabilityMock,
}));

vi.mock('drizzle-orm', () => ({ eq: vi.fn() }));

function mockDbSelect() {
  const chain = {
    from: () => ({
      where: async () => [],
    }),
  };
  return chain;
}

describe('GET /api/availability days clamping', () => {
  it('clamps an excessively large `days` value instead of doing unbounded work', async () => {
    const dbModule = await import('@/lib/db/client');
    (dbModule.db as unknown as { select: () => unknown }).select = () => mockDbSelect();

    const request = new Request('http://localhost:3000/api/availability?days=999999');
    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(computeAvailabilityMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({ days: 60 })
    );
  });

  it('falls back to the default of 14 when `days` is not a number', async () => {
    const dbModule = await import('@/lib/db/client');
    (dbModule.db as unknown as { select: () => unknown }).select = () => mockDbSelect();

    const request = new Request('http://localhost:3000/api/availability?days=not-a-number');
    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(computeAvailabilityMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({ days: 14 })
    );
  });

  it('clamps a zero/negative `days` value up to the minimum of 1', async () => {
    const dbModule = await import('@/lib/db/client');
    (dbModule.db as unknown as { select: () => unknown }).select = () => mockDbSelect();

    const request = new Request('http://localhost:3000/api/availability?days=-5');
    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(computeAvailabilityMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({ days: 1 })
    );
  });
});
