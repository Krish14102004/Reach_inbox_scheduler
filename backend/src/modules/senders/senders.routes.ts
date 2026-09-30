/**
 * FILE: backend/src/modules/senders/senders.routes.ts
 * PHASE: 3 - Core Scheduler (BullMQ + Ethereal)
 * PURPOSE: GET /api/senders (list) and POST /api/senders (create Ethereal sender).
 */

import { Router } from 'express';
import { asyncHandler } from '../../lib/asyncHandler.js';
import { requireAuth } from '../../middleware/requireAuth.js';
import { listUserSenders, createEtherealSenderForUser } from './senders.service.js';

const router = Router();

router.get('/', requireAuth, asyncHandler(async (req, res) => {
  const userId = req.user!.id;
  const senders = await listUserSenders(userId);
  res.json({ items: senders });
}));

router.post('/', requireAuth, asyncHandler(async (req, res) => {
  const userId = req.user!.id;
  const sender = await createEtherealSenderForUser(userId, typeof req.body?.label === 'string' ? req.body.label : 'Ethereal sender');
  res.status(201).json({ sender });
}));

export default router;
