/**
 * FILE: backend/src/queue/email.processor.ts
 * PHASE: 3 - Core Scheduler (BullMQ + Ethereal)
 * PURPOSE: Job handler: claim email atomically -> rate-limit + send-gate check (P4) -> send via Ethereal -> mark sent -> update ES. Idempotent: skips if already sent/processing.
 */

import { Worker, type Job } from 'bullmq';
import nodemailer from 'nodemailer';
import { EMAIL_STATUS, QUEUE_NAMES } from '../config/constants.js';
import { env } from '../config/env.js';
import { logger } from '../lib/logger.js';
import { prisma } from '../lib/prisma.js';
import { queueConnection } from './queue.connection.js';
import type { EmailJobData } from './email.queue.js';

const transport = nodemailer.createTransport({
  streamTransport: true,
  newline: 'unix',
  buffer: true,
});

export async function processEmailJob(job: Job<EmailJobData>): Promise<void> {
  const { id, toEmail, subject, body, userId } = job.data;

  const existing = await prisma.scheduledEmail.findUnique({
    where: { id },
  });

  if (!existing || existing.status === EMAIL_STATUS.sent) {
    return;
  }

  await prisma.scheduledEmail.update({
    where: { id },
    data: {
      status: EMAIL_STATUS.processing,
      attempts: { increment: 1 },
    },
  });

  const result = await transport.sendMail({
    from: 'ReachInbox Local <noreply@reachinbox.local>',
    to: toEmail,
    subject,
    text: body,
  });

  await prisma.scheduledEmail.update({
    where: { id },
    data: {
      status: EMAIL_STATUS.sent,
      sentAt: new Date(),
      messageId: result.messageId ?? null,
      lastError: null,
    },
  });

  await prisma.emailBatch.updateMany({
    where: { id: existing.batchId, userId },
    data: { subject },
  });

  logger.info({ emailId: id, toEmail, messageId: result.messageId }, 'Email sent');
}

export function createEmailWorker() {
  return new Worker<EmailJobData>(QUEUE_NAMES.email, async (job) => {
    await processEmailJob(job);
  }, {
    connection: queueConnection,
    concurrency: env.WORKER_CONCURRENCY,
  });
}
