/**
 * FILE: backend/src/modules/emails/emails.routes.ts
 * PHASE: 3 - Core Scheduler (BullMQ + Ethereal)
 * PURPOSE: POST /api/emails/schedule, GET /api/emails/scheduled, GET /api/emails/sent (paginated, auth required).
 */

import { Router } from 'express';
import { asyncHandler } from '../../lib/asyncHandler.js';
import { requireAuth } from '../../middleware/requireAuth.js';
import { validate } from '../../middleware/validate.js';
import { scheduleEmailsController, listScheduledEmailsController, listSentEmailsController } from './emails.controller.js';
import { listEmailsQuerySchema, scheduleEmailsSchema } from './emails.schema.js';

const router = Router();

router.post('/schedule', requireAuth, validate(scheduleEmailsSchema), asyncHandler(scheduleEmailsController));
router.get('/scheduled', requireAuth, validate(listEmailsQuerySchema, 'query'), asyncHandler(listScheduledEmailsController));
router.get('/sent', requireAuth, validate(listEmailsQuerySchema, 'query'), asyncHandler(listSentEmailsController));

export default router;
