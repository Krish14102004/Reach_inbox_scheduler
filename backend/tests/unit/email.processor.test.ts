/**
 * FILE: backend/tests/unit/email.processor.test.ts
 * PHASE: 9 - Hardening, Load Test, Docs & Submission
 * PURPOSE: Unit tests: idempotency (double delivery of same job sends once), failure paths, reschedule path.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DelayedError } from 'bullmq';
import type { Job } from 'bullmq';
import type { EmailJobData } from '../../src/queue/email.queue.js';

const { prismaMock, sendMailMock } = vi.hoisted(() => ({
	prismaMock: {
		scheduledEmail: {
			findUnique: vi.fn(),
			updateMany: vi.fn(),
			update: vi.fn(),
		},
		sender: { findUnique: vi.fn() },
		emailBatch: { updateMany: vi.fn() },
	},
	sendMailMock: vi.fn(),
}));

const { checkRateLimitMock, acquireSendGateMock, clearSendGateMock, getRescheduledTimeMock, reserveRescheduleRankMock } = vi.hoisted(() => ({
	checkRateLimitMock: vi.fn(),
	acquireSendGateMock: vi.fn(),
	clearSendGateMock: vi.fn(),
	getRescheduledTimeMock: vi.fn(),
	reserveRescheduleRankMock: vi.fn(),
}));

vi.mock('../../src/lib/prisma.js', () => ({ prisma: prismaMock }));
vi.mock('../../src/config/env.js', () => ({
	env: {
		WORKER_CONCURRENCY: 1,
		MIN_DELAY_BETWEEN_EMAILS_MS: 2000,
		MAX_EMAILS_PER_HOUR_PER_SENDER: 200,
		MAX_ATTEMPTS: 5,
	},
}));
vi.mock('../../src/queue/queue.connection.js', () => ({ queueConnection: {} }));
vi.mock('../../src/lib/mailer.js', () => ({ sendMail: sendMailMock }));
vi.mock('../../src/search/indexer.js', () => ({ updateEmailStatus: vi.fn() }));
vi.mock('../../src/modules/slack/slack.notifier.js', () => ({ notifyRateLimitHit: vi.fn() }));
vi.mock('../../src/rate-limit/rateLimiter.js', () => ({ checkRateLimit: checkRateLimitMock }));
vi.mock('../../src/rate-limit/sendGate.js', () => ({
	acquireSendGate: acquireSendGateMock,
	clearSendGate: clearSendGateMock,
}));
vi.mock('../../src/rate-limit/rescheduler.js', () => ({
	getRescheduledTime: getRescheduledTimeMock,
	reserveRescheduleRank: reserveRescheduleRankMock,
}));

import { processEmailJob } from '../../src/queue/email.processor.js';

describe('processEmailJob', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		acquireSendGateMock.mockResolvedValue({ allowed: true, waitMs: 0 });
		checkRateLimitMock.mockResolvedValue({ allowed: true, currentCount: 1, limit: 10, nextWindowStart: new Date() });
	});

	it('sends only once when the same job is delivered twice', async () => {
		let status = 'scheduled';
		const email = {
			id: 'email-1',
			batchId: 'batch-1',
			attempts: 0,
		};

		prismaMock.scheduledEmail.findUnique.mockImplementation(async () => ({ ...email, status }));
		prismaMock.scheduledEmail.updateMany.mockImplementation(async (args: {
			where: { status: string };
			data: { status: string };
		}) => {
			if (status !== args.where.status) return { count: 0 };
			status = args.data.status;
			return { count: 1 };
		});
		prismaMock.scheduledEmail.update.mockImplementation(async (args: { data: { status: string } }) => {
			status = args.data.status;
			return {};
		});
		prismaMock.sender.findUnique.mockResolvedValue({
			id: 'sender-1',
			email: 'sender@example.com',
			smtpHost: 'smtp.ethereal.email',
			smtpPort: 587,
			smtpUser: 'sender@example.com',
			smtpPass: 'test-pass',
		});
		sendMailMock.mockResolvedValue({ messageId: 'message-1', previewUrl: 'https://ethereal.test/message' });

		const job = {
			data: {
				id: 'email-1',
				userId: 'user-1',
				toEmail: 'lead@example.com',
				subject: 'Hello',
				body: 'Test message',
				senderId: 'sender-1',
				scheduledAt: new Date().toISOString(),
				hourlyLimit: 10,
			} satisfies EmailJobData,
			opts: { attempts: 5 },
			attemptsMade: 0,
		} as unknown as Job<EmailJobData>;

		await processEmailJob(job);
		await processEmailJob(job);

		expect(sendMailMock).toHaveBeenCalledTimes(1);
		expect(prismaMock.scheduledEmail.updateMany).toHaveBeenCalledTimes(1);
	});

	it('re-delays a rate-limited job into its ranked next-hour slot', async () => {
		const scheduledAt = new Date('2026-09-30T11:00:04.000Z');
		const job = {
			data: {
				id: 'email-2',
				userId: 'user-1',
				toEmail: 'lead@example.com',
				subject: 'Hello',
				body: 'Test message',
				senderId: 'sender-1',
				scheduledAt: '2026-09-30T10:59:00.000Z',
				hourlyLimit: 1,
			} satisfies EmailJobData,
			opts: { attempts: 5 },
			attemptsMade: 0,
			moveToDelayed: vi.fn().mockResolvedValue(undefined),
		} as unknown as Job<EmailJobData>;

		prismaMock.scheduledEmail.findUnique.mockResolvedValue({ status: 'scheduled', attempts: 0 });
		prismaMock.scheduledEmail.updateMany.mockResolvedValue({ count: 1 });
		checkRateLimitMock.mockResolvedValue({
			allowed: false,
			currentCount: 1,
			limit: 1,
			nextWindowStart: new Date('2026-09-30T11:00:00.000Z'),
		});
		reserveRescheduleRankMock.mockResolvedValue(2);
		getRescheduledTimeMock.mockReturnValue(scheduledAt);

		await expect(processEmailJob(job, 'lock-token')).rejects.toBeInstanceOf(DelayedError);

		expect(clearSendGateMock).toHaveBeenCalledWith('sender-1');
		expect(reserveRescheduleRankMock).toHaveBeenCalledWith('sender-1', new Date('2026-09-30T11:00:00.000Z'));
		expect(prismaMock.scheduledEmail.update).toHaveBeenCalledWith({
			where: { id: 'email-2' },
			data: { status: 'scheduled', scheduledAt },
		});
		expect(job.moveToDelayed).toHaveBeenCalledWith(scheduledAt.getTime(), 'lock-token');
		expect(sendMailMock).not.toHaveBeenCalled();
	});
});
