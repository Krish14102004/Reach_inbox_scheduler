import { afterEach, describe, expect, it, vi } from 'vitest';

const { evalMock } = vi.hoisted(() => ({ evalMock: vi.fn() }));

vi.mock('../../src/lib/redis.js', () => ({ redisClient: { eval: evalMock } }));

import { getRescheduledTime, reserveRescheduleRank } from '../../src/rate-limit/rescheduler.js';

describe('rate-limit rescheduler', () => {
  afterEach(() => vi.clearAllMocks());

  it('places sequential rate-limited emails in rank order in the next hour', () => {
    const now = new Date('2026-09-30T10:59:00.000Z');

    expect(getRescheduledTime(now, 0, 2000)).toEqual(new Date('2026-09-30T11:00:00.000Z'));
    expect(getRescheduledTime(now, 2, 2000)).toEqual(new Date('2026-09-30T11:00:04.000Z'));
  });

  it('reserves a rank atomically for a sender and target window', async () => {
    evalMock.mockResolvedValue(2);
    const now = new Date('2026-09-30T10:30:00.000Z');
    const nextWindowStart = new Date('2026-09-30T11:00:00.000Z');

    await expect(reserveRescheduleRank('sender-1', nextWindowStart, now)).resolves.toBe(2);
    expect(evalMock).toHaveBeenCalledWith(
      expect.any(String),
      1,
      'reschedule:sender-1:2026-09-30T11:00:00.000Z',
      5400,
    );
  });
});