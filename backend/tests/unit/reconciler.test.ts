import { afterEach, describe, expect, it, vi } from 'vitest';

const { prismaMock, addEmailJobsMock } = vi.hoisted(() => ({
  prismaMock: { scheduledEmail: { findMany: vi.fn(), updateMany: vi.fn() } },
  addEmailJobsMock: vi.fn(),
}));

vi.mock('../../src/lib/prisma.js', () => ({ prisma: prismaMock }));
vi.mock('../../src/config/env.js', () => ({ env: { PROCESSING_STALE_AFTER_MS: 300_000 } }));
vi.mock('../../src/lib/logger.js', () => ({ logger: { info: vi.fn() } }));
vi.mock('../../src/queue/email.queue.js', () => ({ addEmailJobs: addEmailJobsMock }));

import { runStartupReconciler } from '../../src/queue/reconciler.js';

describe('runStartupReconciler', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('re-enqueues future scheduled emails with their remaining delay', async () => {
    const now = new Date('2026-09-30T12:00:00.000Z');
    vi.useFakeTimers();
    vi.setSystemTime(now);

    prismaMock.scheduledEmail.findMany.mockResolvedValue([
      {
        id: 'email-future',
        userId: 'user-1',
        senderId: 'sender-1',
        toEmail: 'lead@example.com',
        subject: 'Hello',
        body: 'Test message',
        scheduledAt: new Date(now.getTime() + 60_000),
        batch: { hourlyLimit: 10 },
      },
    ]);
    prismaMock.scheduledEmail.updateMany.mockResolvedValue({ count: 0 });

    const count = await runStartupReconciler();

    expect(count).toBe(1);
    expect(prismaMock.scheduledEmail.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { status: 'scheduled' },
    }));
    expect(addEmailJobsMock).toHaveBeenCalledWith([
      expect.objectContaining({ id: 'email-future', delay: 60_000 }),
    ]);
  });
});