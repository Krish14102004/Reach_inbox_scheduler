import { afterEach, describe, expect, it, vi } from 'vitest';

type ScheduleTransaction = {
  emailBatch: {
    create: (args: unknown) => Promise<{ id: string }>;
  };
  scheduledEmail: {
    createMany: (args: unknown) => Promise<{ count: number }>;
  };
};

const { prismaMock, listUserSendersMock, ensureUserHasSenderMock, addEmailJobsMock, bulkIndexMock } = vi.hoisted(() => ({
  prismaMock: { $transaction: vi.fn() },
  listUserSendersMock: vi.fn(),
  ensureUserHasSenderMock: vi.fn(),
  addEmailJobsMock: vi.fn(),
  bulkIndexMock: vi.fn(),
}));

vi.mock('../../src/lib/prisma.js', () => ({ prisma: prismaMock }));
vi.mock('../../src/modules/senders/senders.service.js', () => ({
  listUserSenders: listUserSendersMock,
  ensureUserHasSender: ensureUserHasSenderMock,
}));
vi.mock('../../src/queue/email.queue.js', () => ({ addEmailJobs: addEmailJobsMock }));
vi.mock('../../src/search/indexer.js', () => ({ bulkIndex: bulkIndexMock }));

import { scheduleEmailsForUser } from '../../src/modules/emails/emails.service.js';

describe('scheduleEmailsForUser', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('persists a batch atomically and assigns available senders round-robin', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-30T12:00:00.000Z'));

    const senders = [
      { id: 'sender-1' },
      { id: 'sender-2' },
    ];
    const createMany = vi.fn().mockResolvedValue({ count: 3 });
    const transaction: ScheduleTransaction = {
      emailBatch: { create: vi.fn().mockResolvedValue({ id: 'batch-1' }) },
      scheduledEmail: { createMany },
    };

    listUserSendersMock.mockResolvedValue(senders);
    prismaMock.$transaction.mockImplementation((work: (tx: ScheduleTransaction) => Promise<unknown>) => work(transaction));
    addEmailJobsMock.mockResolvedValue(undefined);

    const result = await scheduleEmailsForUser('user-1', {
      subject: 'Hello',
      body: 'Test message',
      leads: ['a@example.com', 'b@example.com', 'c@example.com'],
      startTime: '2026-09-30T12:01:00.000Z',
      delayBetweenMs: 60_000,
      hourlyLimit: 10,
    });

    const persisted = createMany.mock.calls[0]?.[0] as { data: Array<{ senderId: string }> };
    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
    expect(persisted.data.map((record) => record.senderId)).toEqual(['sender-1', 'sender-2', 'sender-1']);
    expect(addEmailJobsMock).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({ batchId: 'batch-1', total: 3 });
  });
});