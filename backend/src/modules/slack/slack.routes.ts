/**
 * FILE: backend/src/modules/slack/slack.routes.ts
 * PHASE: 5 - Slack Integration
 * PURPOSE: GET /api/slack/connect (start OAuth), GET /api/slack/callback, GET /api/slack/status, DELETE /api/slack/disconnect.
 */

import { Router } from 'express';
import { asyncHandler } from '../../lib/asyncHandler.js';
import { requireAuth } from '../../middleware/requireAuth.js';
import {
	disconnectSlackAccount,
	getSlackStatus,
	handleSlackCallback,
	startSlackConnect,
} from './slack.controller.js';

const router = Router();

router.get('/connect', requireAuth, asyncHandler(startSlackConnect));
router.get('/callback', asyncHandler(handleSlackCallback));
router.get('/status', requireAuth, asyncHandler(getSlackStatus));
router.delete('/disconnect', requireAuth, asyncHandler(disconnectSlackAccount));

export default router;
