/**
 * FILE: backend/src/modules/senders/senders.repository.ts
 * PHASE: 3 - Core Scheduler (BullMQ + Ethereal)
 * PURPOSE: Prisma queries for Sender (Ethereal SMTP creds): listByUser, findById.
 */

import { prisma } from '../../lib/prisma.js';

export const sendersRepository = {
  async listByUser(userId: string) {
    return prisma.sender.findMany({
      where: { userId },
      orderBy: { email: 'asc' },
    });
  },

  async findById(id: string) {
    return prisma.sender.findUnique({
      where: { id },
    });
  },

  async create(data: {
    userId: string;
    email: string;
    smtpHost: string;
    smtpPort: number;
    smtpUser: string;
    smtpPass: string;
    label?: string | null;
  }) {
    return prisma.sender.create({
      data,
    });
  },
};
