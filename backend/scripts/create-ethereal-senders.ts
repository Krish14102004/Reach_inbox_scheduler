/**
 * FILE: backend/scripts/create-ethereal-senders.ts
 * PHASE: 3 - Core Scheduler (BullMQ + Ethereal)
 * PURPOSE: CLI: creates N Ethereal accounts via nodemailer.createTestAccount() and stores them as Senders for a user.
 */

import nodemailer from 'nodemailer';
import { disconnectPrisma, prisma } from '../src/lib/prisma.js';

async function createSenders(): Promise<void> {
	const [userId, countInput = '1'] = process.argv.slice(2);
	const count = Number(countInput);

	if (!userId) {
		throw new Error('Usage: npm run senders:create -- <userId> [count]');
	}
	if (!Number.isSafeInteger(count) || count < 1) {
		throw new Error('Sender count must be a positive integer.');
	}

	const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
	if (!user) {
		throw new Error(`User ${userId} was not found.`);
	}

	for (let index = 0; index < count; index += 1) {
		const account = await nodemailer.createTestAccount();
		const sender = await prisma.sender.create({
			data: {
				userId,
				email: account.user,
				smtpHost: 'smtp.ethereal.email',
				smtpPort: 587,
				smtpUser: account.user,
				smtpPass: account.pass,
				label: `Ethereal sender ${index + 1}`,
			},
			select: { id: true, email: true },
		});

		console.log(`Created Ethereal sender ${sender.email} (${sender.id}).`);
	}
}

async function main(): Promise<void> {
	try {
		await createSenders();
	} catch (error) {
		console.error(error instanceof Error ? error.message : error);
		process.exitCode = 1;
	} finally {
		await disconnectPrisma().catch(() => undefined);
	}
}

void main();
