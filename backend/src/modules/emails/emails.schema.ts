/**
 * FILE: backend/src/modules/emails/emails.schema.ts
 * PHASE: 3 - Core Scheduler (BullMQ + Ethereal)
 * PURPOSE: Zod schemas: schedule request (subject, body, leads[], startTime, delayBetweenMs, hourlyLimit) and list query params.
 */

import { z } from 'zod';

export const scheduleEmailsSchema = z.object({
  subject: z.string().trim().min(1).max(998),
  body: z.string().trim().min(1),
  leads: z.array(z.string().trim().email()).min(1).max(5000),
  startTime: z.string().datetime(),
  delayBetweenMs: z.coerce.number().int().nonnegative().default(1000),
  hourlyLimit: z.coerce.number().int().positive().default(50),
});

export const listEmailsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});
