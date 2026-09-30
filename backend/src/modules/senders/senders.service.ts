/**
 * FILE: backend/src/modules/senders/senders.service.ts
 * PHASE: 3 - Core Scheduler (BullMQ + Ethereal)
 * PURPOSE: Ensure a user has senders (creates Ethereal test accounts on demand); round-robin selection helper.
 */

import nodemailer from 'nodemailer';
import { sendersRepository } from './senders.repository.js';

export async function createEtherealSenderForUser(userId: string, label?: string) {
  const account = await nodemailer.createTestAccount();

  return sendersRepository.create({
    userId,
    email: account.user,
    smtpHost: 'smtp.ethereal.email',
    smtpPort: 587,
    smtpUser: account.user,
    smtpPass: account.pass,
    label: label ?? 'Ethereal test sender',
  });
}

export async function ensureUserHasSender(userId: string) {
  const existing = await sendersRepository.listByUser(userId);
  if (existing.length > 0) {
    return existing[0];
  }

  return createEtherealSenderForUser(userId, 'Default sender');
}

export async function listUserSenders(userId: string) {
  return sendersRepository.listByUser(userId);
}
