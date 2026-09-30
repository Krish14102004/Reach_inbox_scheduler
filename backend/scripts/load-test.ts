/**
 * FILE: backend/scripts/load-test.ts
 * PHASE: 9 - Hardening, Load Test, Docs & Submission
 * PURPOSE: CLI: schedules 1000+ emails at the same instant to prove rate-limit + ordering + no-drop behaviour.
 */

import { disconnectPrisma, prisma } from '../src/lib/prisma.js';
import { closeRedisClient, redisClient } from '../src/lib/redis.js';
import { scheduleEmailsForUser } from '../src/modules/emails/emails.service.js';
import { emailQueue } from '../src/queue/email.queue.js';

async function runLoad(): Promise<void> {
	const [userId, countText = '1000', hourlyLimitText = '200'] = process.argv.slice(2);
	const count = Number(countText);
	const hourlyLimit = Number(hourlyLimitText);

	if (!userId) {
		throw new Error('Usage: npm run load:test -- <userId> [count=1000] [hourlyLimit=200]');
	}
	if (!Number.isSafeInteger(count) || count < 1 || count > 5000) {
		throw new Error('Count must be a positive integer no greater than 5000.');
	}
	if (!Number.isSafeInteger(hourlyLimit) || hourlyLimit < 1) {
		throw new Error('Hourly limit must be a positive integer.');
	}

	await prisma.$connect();
	await redisClient.connect();

	const result = await scheduleEmailsForUser(userId, {
		subject: `ReachInbox load test ${new Date().toISOString()}`,
		body: 'Automated load-test message. This is a non-deliverable example address.',
		leads: Array.from({ length: count }, (_, index) => `load-${index + 1}@example.test`),
		startTime: new Date(Date.now() + 5000).toISOString(),
		delayBetweenMs: 0,
		hourlyLimit,
	});

	console.log(`Scheduled ${result.total} emails in batch ${result.batchId}. Start the worker separately to process the jobs.`);
}

async function main(): Promise<void> {
	try {
		await runLoad();
	} catch (error) {
		console.error(error instanceof Error ? error.message : error);
		process.exitCode = 1;
	} finally {
		await emailQueue.close().catch(() => undefined);
		await closeRedisClient(redisClient).catch(() => undefined);
		await disconnectPrisma().catch(() => undefined);
	}
}

void main();
