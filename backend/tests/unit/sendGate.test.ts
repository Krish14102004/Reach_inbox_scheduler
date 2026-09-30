import { afterEach, describe, expect, it, vi } from 'vitest';

const { setMock, pttlMock, delMock } = vi.hoisted(() => ({
  setMock: vi.fn(),
  pttlMock: vi.fn(),
  delMock: vi.fn(),
}));

vi.mock('../../src/lib/redis.js', () => ({
  redisClient: { set: setMock, pttl: pttlMock, del: delMock },
}));

import { acquireSendGate, clearSendGate } from '../../src/rate-limit/sendGate.js';

describe('per-sender send gate', () => {
  afterEach(() => vi.clearAllMocks());

  it('acquires a sender gate for the configured minimum delay', async () => {
    setMock.mockResolvedValue('OK');

    await expect(acquireSendGate('sender-1', 2500)).resolves.toEqual({ allowed: true, waitMs: 0 });
    expect(setMock).toHaveBeenCalledWith('gate:sender-1', '1', 'PX', 2500, 'NX');
    expect(pttlMock).not.toHaveBeenCalled();
  });

  it('returns the remaining gate time when another job holds the sender gate', async () => {
    setMock.mockResolvedValue(null);
    pttlMock.mockResolvedValue(875);

    await expect(acquireSendGate('sender-1', 2500)).resolves.toEqual({ allowed: false, waitMs: 875 });
    expect(pttlMock).toHaveBeenCalledWith('gate:sender-1');
  });

  it('clears a sender gate after a non-send deferral', async () => {
    delMock.mockResolvedValue(1);

    await clearSendGate('sender-1');

    expect(delMock).toHaveBeenCalledWith('gate:sender-1');
  });
});