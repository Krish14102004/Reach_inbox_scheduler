/**
 * FILE: backend/src/modules/emails/emails.service.ts
 * PHASE: 3 - Core Scheduler (BullMQ + Ethereal)
 * PURPOSE: Orchestrates scheduling: validate -> compute schedule -> DB transaction (batch + emails) -> enqueue BullMQ delayed jobs -> index in ES. Queries for tables.
 */

import { randomUUID } from 'node:crypto';
import { prisma } from '../../lib/prisma.js';
import { BadRequestError } from '../../lib/errors.js';
import { ensureUserHasSender, listUserSenders } from '../senders/senders.service.js';
import { scheduleEmails } from './schedule.calculator.js';
import { addEmailJobs } from '../../queue/email.queue.js';
import { bulkIndex } from '../../search/indexer.js';

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

  const existingSenders = await listUserSenders(userId);
  const senders = existingSenders.length > 0 ? existingSenders : [await ensureUserHasSender(userId)];

  const planned = scheduleEmails({
    leads: payload.leads,
    startTime: new Date(payload.startTime),
    delayBetweenMs: payload.delayBetweenMs,
    senderCount: senders.length,
  });

  const { batchId, createdRecords } = await prisma.$transaction(async (transaction) => {
    const batch = await transaction.emailBatch.create({
      data: {
        userId,
        subject: payload.subject,
        body: payload.body,
        startTime: new Date(payload.startTime),
        delayBetweenMs: payload.delayBetweenMs,
        hourlyLimit: payload.hourlyLimit,
      },
    });

    const records = planned.map((item) => ({
      id: randomUUID(),
      batchId: batch.id,
      userId,
      senderId: senders[item.senderIndex]!.id,
      toEmail: item.email,
      subject: payload.subject,
      body: payload.body,
      scheduledAt: item.scheduledAt,
      idempotencyKey: randomUUID().replace(/-/g, '').slice(0, 64),
    }));

    await transaction.scheduledEmail.createMany({ data: records });

    return {
      batchId: batch.id,
      createdRecords: records.map((record) => ({ ...record, status: 'scheduled' })),
    };
  });

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
        hourlyLimit: payload.hourlyLimit,
      },
      delay: Math.max(0, record.scheduledAt.getTime() - Date.now()),
    })),
  );

  await bulkIndex(createdRecords.map((record) => ({
    id: record.id,
    userId,
    senderId: record.senderId,
    toEmail: record.toEmail,
    subject: payload.subject,
    body: payload.body,
    status: record.status,
    scheduledAt: record.scheduledAt.toISOString(),
    sentAt: null,
  })));

  return {
    batchId,
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
