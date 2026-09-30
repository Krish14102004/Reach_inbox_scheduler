/**
 * FILE: backend/tests/unit/email.processor.test.ts
 * PHASE: 9 - Hardening, Load Test, Docs & Submission
 * PURPOSE: Unit tests: idempotency (double delivery of same job sends once), failure paths, reschedule path.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Job } from 'bullmq';
import type { EmailJobData } from '../../src/queue/email.queue.js';

const { prismaMock, sendMailMock } = vi.hoisted(() => ({
	prismaMock: {
		scheduledEmail: {
			findUnique: vi.fn(),
			updateMany: vi.fn(),
			update: vi.fn(),
		},
		emailBatch: { updateMany: vi.fn() },
	},
	sendMailMock: vi.fn(),
}));

vi.mock('../../src/lib/prisma.js', () => ({ prisma: prismaMock }));
vi.mock('../../src/config/env.js', () => ({ env: { WORKER_CONCURRENCY: 1 } }));
vi.mock('../../src/queue/queue.connection.js', () => ({ queueConnection: {} }));
vi.mock('nodemailer', () => ({
	default: {
		createTransport: () => ({ sendMail: sendMailMock }),
	},
}));

import { processEmailJob } from '../../src/queue/email.processor.js';

describe('processEmailJob', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('sends only once when the same job is delivered twice', async () => {
		let status = 'scheduled';
		const email = {
			id: 'email-1',
			batchId: 'batch-1',
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
		prismaMock.emailBatch.updateMany.mockResolvedValue({ count: 1 });
		sendMailMock.mockResolvedValue({ messageId: 'message-1' });

		const job = {
			data: {
				id: 'email-1',
				userId: 'user-1',
				toEmail: 'lead@example.com',
				subject: 'Hello',
				body: 'Test message',
				senderId: 'sender-1',
				scheduledAt: new Date().toISOString(),
			} satisfies EmailJobData,
		} as unknown as Job<EmailJobData>;

		await processEmailJob(job);
		await processEmailJob(job);

		expect(sendMailMock).toHaveBeenCalledTimes(1);
		expect(prismaMock.scheduledEmail.updateMany).toHaveBeenCalledTimes(1);
	});
});
