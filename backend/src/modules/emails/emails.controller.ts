/**
 * FILE: backend/src/modules/emails/emails.controller.ts
 * PHASE: 3 - Core Scheduler (BullMQ + Ethereal)
 * PURPOSE: HTTP layer: parse validated input, call service, shape responses.
 */

import type { Request, Response } from 'express';
import { scheduleEmailsForUser, listScheduledEmailsForUser, listSentEmailsForUser } from './emails.service.js';

export async function scheduleEmailsController(req: Request, res: Response): Promise<void> {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } });
    return;
  }

  const result = await scheduleEmailsForUser(userId, req.body);
  res.status(201).json(result);
}

export async function listScheduledEmailsController(req: Request, res: Response): Promise<void> {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } });
    return;
  }

  const page = Number(req.query.page ?? 1);
  const pageSize = Number(req.query.pageSize ?? 20);
  const result = await listScheduledEmailsForUser(userId, page, pageSize);
  res.json(result);
}

export async function listSentEmailsController(req: Request, res: Response): Promise<void> {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } });
    return;
  }

  const page = Number(req.query.page ?? 1);
  const pageSize = Number(req.query.pageSize ?? 20);
  const result = await listSentEmailsForUser(userId, page, pageSize);
  res.json(result);
}
