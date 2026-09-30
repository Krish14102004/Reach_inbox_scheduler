/**
 * FILE: backend/tests/integration/restart-persistence.test.ts
 * PHASE: 9 - Hardening, Load Test, Docs & Submission
 * PURPOSE: Integration: schedule -> kill worker -> restart -> job still sent once at correct time.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Job } from 'bullmq';
import type { EmailJobData } from '../../src/queue/email.queue.js';

const { prismaMock, sendMailMock } = vi.hoisted(() => ({
  prismaMock: {
    scheduledEmail: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      updateMany: vi.fn(),
      update: vi.fn(),
    },
    sender: { findUnique: vi.fn() },
    emailBatch: { updateMany: vi.fn() },
  },
  sendMailMock: vi.fn(),
}));

const { checkRateLimitMock, acquireSendGateMock, clearSendGateMock, addEmailJobsMock } = vi.hoisted(() => ({
  checkRateLimitMock: vi.fn(),
  acquireSendGateMock: vi.fn(),
  clearSendGateMock: vi.fn(),
  addEmailJobsMock: vi.fn(),
}));

vi.mock('../../src/lib/prisma.js', () => ({ prisma: prismaMock }));
vi.mock('../../src/config/env.js', () => ({
  env: {
    PROCESSING_STALE_AFTER_MS: 300_000,
    WORKER_CONCURRENCY: 1,
    MIN_DELAY_BETWEEN_EMAILS_MS: 0,
    MAX_EMAILS_PER_HOUR_PER_SENDER: 200,
    MAX_ATTEMPTS: 5,
  },
}));
vi.mock('../../src/lib/logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));
vi.mock('../../src/queue/queue.connection.js', () => ({ queueConnection: {} }));
vi.mock('../../src/queue/email.queue.js', () => ({
  addEmailJobs: addEmailJobsMock,
}));
vi.mock('../../src/lib/mailer.js', () => ({ sendMail: sendMailMock }));
vi.mock('../../src/search/indexer.js', () => ({ updateEmailStatus: vi.fn() }));
vi.mock('../../src/modules/slack/slack.notifier.js', () => ({ notifyRateLimitHit: vi.fn() }));
vi.mock('../../src/rate-limit/rateLimiter.js', () => ({ checkRateLimit: checkRateLimitMock }));
vi.mock('../../src/rate-limit/sendGate.js', () => ({
  acquireSendGate: acquireSendGateMock,
  clearSendGate: clearSendGateMock,
}));

import { runStartupReconciler } from '../../src/queue/reconciler.js';
import { processEmailJob } from '../../src/queue/email.processor.js';

describe('Restart persistence integration flow', () => {
  const simulatedStartTime = new Date('2026-09-30T12:00:00.000Z');

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(simulatedStartTime);
    vi.clearAllMocks();

    acquireSendGateMock.mockResolvedValue({ allowed: true, waitMs: 0 });
    checkRateLimitMock.mockResolvedValue({
      allowed: true,
      currentCount: 1,
      limit: 10,
      nextWindowStart: new Date('2026-09-30T13:00:00.000Z'),
    });
    sendMailMock.mockResolvedValue({
      messageId: 'ethereal-msg-123',
      previewUrl: 'https://ethereal.email/message/123',
    });
    prismaMock.sender.findUnique.mockResolvedValue({
      id: 'sender-1',
      email: 'sender@example.com',
      smtpHost: 'smtp.ethereal.email',
      smtpPort: 587,
      smtpUser: 'sender@example.com',
      smtpPass: 'password',
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('recovers pending scheduled emails on worker restart and executes delivery exactly once', async () => {
    // 1. Initial State in DB: Email was scheduled for +30s, worker was shut down
    const scheduledTime = new Date(simulatedStartTime.getTime() + 30_000);
    let emailStatus = 'scheduled';
    const emailRecord = {
      id: 'email-persisted-1',
      userId: 'user-1',
      senderId: 'sender-1',
      toEmail: 'lead@example.com',
      subject: 'Follow-up',
      body: 'Testing restart persistence',
      scheduledAt: scheduledTime,
      batch: { hourlyLimit: 50 },
    };

    prismaMock.scheduledEmail.findMany.mockResolvedValue([emailRecord]);
    prismaMock.scheduledEmail.updateMany.mockImplementation(async (args: {
      where: { status: string; id?: string };
      data: { status: string };
    }) => {
      if (args.where.status && emailStatus !== args.where.status) {
        return { count: 0 };
      }
      emailStatus = args.data.status;
      return { count: 1 };
    });
    prismaMock.scheduledEmail.findUnique.mockImplementation(async () => ({
      id: emailRecord.id,
      batchId: 'batch-1',
      status: emailStatus,
      attempts: 0,
    }));
    prismaMock.scheduledEmail.update.mockImplementation(async (args: { data: { status: string } }) => {
      emailStatus = args.data.status;
      return {};
    });

    // 2. Restart Reconciler runs at boot (simulating app/worker startup)
    const reconciledCount = await runStartupReconciler();

    expect(reconciledCount).toBe(1);
    expect(addEmailJobsMock).toHaveBeenCalledWith([
      expect.objectContaining({
        id: 'email-persisted-1',
        delay: 30_000,
        data: expect.objectContaining({
          id: 'email-persisted-1',
          toEmail: 'lead@example.com',
        }),
      }),
    ]);

    // 3. Advance clock to scheduled send time
    vi.advanceTimersByTime(30_000);

    // 4. Worker picks up the job
    const job = {
      data: {
        id: 'email-persisted-1',
        userId: 'user-1',
        toEmail: 'lead@example.com',
        subject: 'Follow-up',
        body: 'Testing restart persistence',
        senderId: 'sender-1',
        scheduledAt: scheduledTime.toISOString(),
        hourlyLimit: 50,
      } satisfies EmailJobData,
      opts: { attempts: 5 },
      attemptsMade: 0,
    } as unknown as Job<EmailJobData>;

    await processEmailJob(job);

    expect(sendMailMock).toHaveBeenCalledTimes(1);
    expect(emailStatus).toBe('sent');

    // 5. Subsequent delivery attempt (e.g. queue retry or duplicate event) is ignored idempotently
    await processEmailJob(job);
    expect(sendMailMock).toHaveBeenCalledTimes(1);
  });

  it('resets stale processing emails from a crashed worker on startup and completes send', async () => {
    let emailStatus = 'processing';
    const scheduledTime = new Date(simulatedStartTime.getTime() - 600_000); // 10 minutes ago
    const emailRecord = {
      id: 'email-stale-1',
      userId: 'user-1',
      senderId: 'sender-1',
      toEmail: 'stale-lead@example.com',
      subject: 'Stale recovery',
      body: 'Recovering crashed job',
      scheduledAt: scheduledTime,
      batch: { hourlyLimit: 50 },
    };

    // Stale reset query finds and resets the status to 'scheduled'
    prismaMock.scheduledEmail.updateMany.mockImplementation(async (args: {
      where: { status: string; updatedAt?: { lt: Date } };
      data: { status: string };
    }) => {
      if (args.where.status === 'processing') {
        emailStatus = args.data.status;
        return { count: 1 };
      }
      if (args.where.status === 'scheduled') {
        emailStatus = args.data.status;
        return { count: 1 };
      }
      return { count: 0 };
    });

    prismaMock.scheduledEmail.findMany.mockImplementation(async () => {
      if (emailStatus === 'scheduled') {
        return [emailRecord];
      }
      return [];
    });

    prismaMock.scheduledEmail.findUnique.mockImplementation(async () => ({
      id: emailRecord.id,
      batchId: 'batch-1',
      status: emailStatus,
      attempts: 0,
    }));
    prismaMock.scheduledEmail.update.mockImplementation(async (args: { data: { status: string } }) => {
      emailStatus = args.data.status;
      return {};
    });

    const reconciledCount = await runStartupReconciler();

    expect(reconciledCount).toBe(1);
    expect(addEmailJobsMock).toHaveBeenCalledWith([
      expect.objectContaining({
        id: 'email-stale-1',
        delay: 0, // Past due jobs are enqueued with 0 delay (immediate)
      }),
    ]);

    const job = {
      data: {
        id: 'email-stale-1',
        userId: 'user-1',
        toEmail: 'stale-lead@example.com',
        subject: 'Stale recovery',
        body: 'Recovering crashed job',
        senderId: 'sender-1',
        scheduledAt: scheduledTime.toISOString(),
        hourlyLimit: 50,
      } satisfies EmailJobData,
      opts: { attempts: 5 },
      attemptsMade: 0,
    } as unknown as Job<EmailJobData>;

    await processEmailJob(job);

    expect(sendMailMock).toHaveBeenCalledTimes(1);
    expect(emailStatus).toBe('sent');
  });
});
