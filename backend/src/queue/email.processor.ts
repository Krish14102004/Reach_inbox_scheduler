/**
 * FILE: backend/src/queue/email.processor.ts
 * PHASE: 3 - Core Scheduler (BullMQ + Ethereal)
 * PURPOSE: Job handler: claim email atomically -> rate-limit + send-gate check (P4) -> send via Ethereal -> mark sent -> update ES. Idempotent: skips if already sent/processing.
 */

import { DelayedError, Worker, type Job } from 'bullmq';
import { EMAIL_STATUS, QUEUE_NAMES } from '../config/constants.js';
import { env } from '../config/env.js';
import { logger } from '../lib/logger.js';
import { sendMail } from '../lib/mailer.js';
import { prisma } from '../lib/prisma.js';
import { getHourWindowStart } from '../lib/time.js';
import { checkRateLimit } from '../rate-limit/rateLimiter.js';
import { acquireSendGate, clearSendGate } from '../rate-limit/sendGate.js';
import { getRescheduledTime, reserveRescheduleRank } from '../rate-limit/rescheduler.js';
import { notifyRateLimitHit } from '../modules/slack/slack.notifier.js';
import { updateEmailStatus } from '../search/indexer.js';
import { queueConnection } from './queue.connection.js';
import type { EmailJobData } from './email.queue.js';

async function moveJobToDelayed(job: Job<EmailJobData>, token: string | undefined, scheduledAt: Date): Promise<never> {
  await prisma.scheduledEmail.update({
    where: { id: job.data.id },
    data: { status: EMAIL_STATUS.scheduled, scheduledAt },
  });
  await job.moveToDelayed(scheduledAt.getTime(), token);
  throw new DelayedError();
}

export async function processEmailJob(job: Job<EmailJobData>, token?: string): Promise<void> {
  const { id, toEmail, subject, body, senderId } = job.data;

  const existing = await prisma.scheduledEmail.findUnique({
    where: { id },
  });

  if (!existing || existing.status === EMAIL_STATUS.sent) {
    return;
  }

  const claim = await prisma.scheduledEmail.updateMany({
    where: { id, status: EMAIL_STATUS.scheduled },
    data: { status: EMAIL_STATUS.processing },
  });

  if (claim.count === 0) {
    return;
  }

  let attemptNumber: number | undefined;

  try {
    const sendGate = await acquireSendGate(senderId, env.MIN_DELAY_BETWEEN_EMAILS_MS);
    if (!sendGate.allowed) {
      await moveJobToDelayed(job, token, new Date(Date.now() + sendGate.waitMs));
    }

    const limit = Math.min(job.data.hourlyLimit, env.MAX_EMAILS_PER_HOUR_PER_SENDER);
    const rateLimit = await checkRateLimit(senderId, limit);
    if (!rateLimit.allowed) {
      await clearSendGate(senderId);
      await notifyRateLimitHit({
        userId: job.data.userId,
        senderId,
        windowStart: getHourWindowStart(new Date()),
        nextWindowStart: rateLimit.nextWindowStart,
      });
      const rank = await reserveRescheduleRank(senderId, rateLimit.nextWindowStart);
      const scheduledAt = getRescheduledTime(
        new Date(),
        rank,
        env.MIN_DELAY_BETWEEN_EMAILS_MS,
      );
      await moveJobToDelayed(job, token, scheduledAt);
    }

    const sender = await prisma.sender.findUnique({ where: { id: senderId } });
    if (!sender) {
      throw new Error(`Sender ${senderId} was not found`);
    }

    attemptNumber = existing.attempts + 1;
    await prisma.scheduledEmail.update({
      where: { id },
      data: { attempts: { increment: 1 } },
    });

    const result = await sendMail(sender, {
      to: toEmail,
      subject,
      text: body,
    });

    await prisma.scheduledEmail.update({
      where: { id },
      data: {
        status: EMAIL_STATUS.sent,
        sentAt: new Date(),
        messageId: result.messageId,
        lastError: null,
      },
    });
    await updateEmailStatus(id, EMAIL_STATUS.sent, new Date());

    logger.info({ emailId: id, toEmail, messageId: result.messageId, previewUrl: result.previewUrl }, 'Email sent');
  } catch (error) {
    if (error instanceof DelayedError) {
      throw error;
    }

    await clearSendGate(senderId).catch(() => undefined);
    const maxAttempts = job.opts.attempts ?? env.MAX_ATTEMPTS;
    const status = attemptNumber !== undefined && attemptNumber >= maxAttempts
      ? EMAIL_STATUS.failed
      : EMAIL_STATUS.scheduled;
    const message = error instanceof Error ? error.message : String(error);

    await prisma.scheduledEmail.update({
      where: { id },
      data: { status, lastError: message },
    });
    await updateEmailStatus(id, status);

    throw error;
  }
}

export function createEmailWorker() {
  return new Worker<EmailJobData>(QUEUE_NAMES.email, async (job, token) => {
    await processEmailJob(job, token);
  }, {
    connection: queueConnection,
    concurrency: env.WORKER_CONCURRENCY,
  });
}
