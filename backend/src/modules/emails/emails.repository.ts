/**
 * FILE: backend/src/modules/emails/emails.repository.ts
 * PHASE: 3 - Core Scheduler (BullMQ + Ethereal)
 * PURPOSE: Prisma queries: bulk create emails, atomic status transitions (claim scheduled->processing), mark sent/failed, list by status with pagination.
 */

import { EMAIL_STATUS } from '../../config/constants.js';
import { prisma } from '../../lib/prisma.js';

type EmailStatusValue = (typeof EMAIL_STATUS)[keyof typeof EMAIL_STATUS];

export const emailsRepository = {
  async findById(id: string) {
    return prisma.scheduledEmail.findUnique({ where: { id } });
  },

  async markProcessing(id: string) {
    return prisma.scheduledEmail.update({
      where: { id },
      data: {
        status: EMAIL_STATUS.processing,
        attempts: { increment: 1 },
      },
    });
  },

  async markSent(id: string, messageId: string | null, lastError?: string | null) {
    return prisma.scheduledEmail.update({
      where: { id },
      data: {
        status: EMAIL_STATUS.sent,
        sentAt: new Date(),
        messageId,
        lastError: lastError ?? null,
      },
    });
  },

  async listByUserStatus(userId: string, status: EmailStatusValue, page: number, pageSize: number) {
    const skip = (page - 1) * pageSize;

    return prisma.scheduledEmail.findMany({
      where: { userId, status },
      orderBy: { scheduledAt: status === EMAIL_STATUS.sent ? 'desc' : 'asc' },
      skip,
      take: pageSize,
    });
  },
};
