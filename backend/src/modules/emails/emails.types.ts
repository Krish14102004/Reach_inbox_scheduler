/**
 * FILE: backend/src/modules/emails/emails.types.ts
 * PHASE: 3 - Core Scheduler (BullMQ + Ethereal)
 * PURPOSE: Shared TS types/DTOs for emails (ScheduledEmailDTO, SentEmailDTO, EmailStatus).
 */

export type EmailStatus = 'scheduled' | 'processing' | 'sent' | 'failed';

export interface EmailScheduleItem {
  id: string;
  toEmail: string;
  subject: string;
  body: string;
  scheduledAt: Date;
  senderId: string;
  status: EmailStatus;
}
