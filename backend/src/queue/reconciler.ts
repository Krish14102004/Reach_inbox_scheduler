/**
 * FILE: backend/src/queue/reconciler.ts
 * PHASE: 3 - Core Scheduler (BullMQ + Ethereal)
 * PURPOSE: Runs once at startup (NOT cron): re-enqueues DB emails still `scheduled` but missing a BullMQ job; resets stuck `processing` rows. Guarantees restart safety.
 */

import { EMAIL_STATUS, QUEUE_NAMES } from '../config/constants.js';
import { env } from '../config/env.js';
import { logger } from '../lib/logger.js';
import { prisma } from '../lib/prisma.js';
import { addEmailJobs, type EmailJobData } from './email.queue.js';

export async function runStartupReconciler(): Promise<number> {
  const staleBefore = new Date(Date.now() - env.PROCESSING_STALE_AFTER_MS);
  const reset = await prisma.scheduledEmail.updateMany({
    where: {
      status: EMAIL_STATUS.processing,
      updatedAt: { lt: staleBefore },
    },
    data: { status: EMAIL_STATUS.scheduled },
  });

  const dueJobs = await prisma.scheduledEmail.findMany({
    where: {
      status: EMAIL_STATUS.scheduled,
    },
    select: {
      id: true,
      userId: true,
      senderId: true,
      toEmail: true,
      subject: true,
      body: true,
      scheduledAt: true,
      batch: { select: { hourlyLimit: true } },
    },
  });

  if (dueJobs.length === 0) {
    if (reset.count > 0) {
      logger.info({ count: reset.count }, 'Reset stale processing emails');
    }
    return 0;
  }

  const jobs = dueJobs.map((job) => ({
    id: job.id,
    data: {
      id: job.id,
      userId: job.userId,
      toEmail: job.toEmail,
      subject: job.subject,
      body: job.body,
      senderId: job.senderId,
      scheduledAt: job.scheduledAt.toISOString(),
      hourlyLimit: job.batch.hourlyLimit,
    } satisfies EmailJobData,
    delay: Math.max(0, job.scheduledAt.getTime() - Date.now()),
  }));

  await addEmailJobs(jobs);

  logger.info({
    count: jobs.length,
    resetCount: reset.count,
    queue: QUEUE_NAMES.email,
  }, 'Reconciled scheduled emails back into the queue');

  return jobs.length;
}
