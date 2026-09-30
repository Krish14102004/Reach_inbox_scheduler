/**
 * FILE: backend/src/modules/emails/emails.service.ts
 * PHASE: 3 - Core Scheduler (BullMQ + Ethereal)
 * PURPOSE: Orchestrates scheduling: validate -> compute schedule -> DB transaction (batch + emails) -> enqueue BullMQ delayed jobs -> index in ES. Queries for tables.
 */

import { randomUUID } from 'node:crypto';
import { prisma } from '../../lib/prisma.js';
import { BadRequestError } from '../../lib/errors.js';
import { scheduleEmails } from './schedule.calculator.js';
import { addEmailJobs } from '../../queue/email.queue.js';

export interface ScheduleEmailBatchInput {
  subject: string;
  body: string;
  leads: string[];
  startTime: string;
  delayBetweenMs: number;
  hourlyLimit: number;
}

export async function scheduleEmailsForUser(userId: string, payload: ScheduleEmailBatchInput) {
  if (!payload.leads.length) {
    throw new BadRequestError('At least one recipient is required.');
  }

  const sender = await prisma.sender.create({
    data: {
      userId,
      email: 'noreply@reachinbox.local',
      smtpHost: 'localhost',
      smtpPort: 2525,
      smtpUser: 'local-user',
      smtpPass: 'local-pass',
      label: 'Local queue sender',
    },
  });

  const batch = await prisma.emailBatch.create({
    data: {
      userId,
      subject: payload.subject,
      body: payload.body,
      startTime: new Date(payload.startTime),
      delayBetweenMs: payload.delayBetweenMs,
      hourlyLimit: payload.hourlyLimit,
    },
  });

  const planned = scheduleEmails({
    leads: payload.leads,
    startTime: new Date(payload.startTime),
    delayBetweenMs: payload.delayBetweenMs,
    senderCount: 1,
  });

  const createdRecords = [] as Array<{ id: string; toEmail: string; scheduledAt: Date; senderId: string; status: string }>; 

  for (const item of planned) {
    const created = await prisma.scheduledEmail.create({
      data: {
        id: randomUUID(),
        batchId: batch.id,
        userId,
        senderId: sender.id,
        toEmail: item.email,
        subject: payload.subject,
        body: payload.body,
        scheduledAt: item.scheduledAt,
        idempotencyKey: randomUUID().replace(/-/g, '').slice(0, 64),
      },
    });

    createdRecords.push({
      id: created.id,
      toEmail: created.toEmail,
      scheduledAt: created.scheduledAt,
      senderId: created.senderId,
      status: created.status,
    });
  }

  await addEmailJobs(
    createdRecords.map((record) => ({
      id: record.id,
      data: {
        id: record.id,
        userId,
        toEmail: record.toEmail,
        subject: payload.subject,
        body: payload.body,
        senderId: record.senderId,
        scheduledAt: record.scheduledAt.toISOString(),
      },
      delay: Math.max(0, record.scheduledAt.getTime() - Date.now()),
    })),
  );

  return {
    batchId: batch.id,
    total: createdRecords.length,
    items: createdRecords,
  };
}

export async function listScheduledEmailsForUser(userId: string, page: number, pageSize: number) {
  const skip = (page - 1) * pageSize;
  const [items, total] = await Promise.all([
    prisma.scheduledEmail.findMany({
      where: { userId, status: 'scheduled' },
      orderBy: { scheduledAt: 'asc' },
      skip,
      take: pageSize,
    }),
    prisma.scheduledEmail.count({
      where: { userId, status: 'scheduled' },
    }),
  ]);

  return { items, total, page, pageSize };
}

export async function listSentEmailsForUser(userId: string, page: number, pageSize: number) {
  const skip = (page - 1) * pageSize;
  const [items, total] = await Promise.all([
    prisma.scheduledEmail.findMany({
      where: { userId, status: 'sent' },
      orderBy: { sentAt: 'desc' },
      skip,
      take: pageSize,
    }),
    prisma.scheduledEmail.count({
      where: { userId, status: 'sent' },
    }),
  ]);

  return { items, total, page, pageSize };
}
