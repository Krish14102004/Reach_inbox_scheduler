/**
 * FILE: backend/src/modules/search/search.routes.ts
 * PHASE: 6 - Search (Elasticsearch) & Queue Dashboard
 * PURPOSE: GET /api/search/emails?q=&status=&page= (auth required).
 */

import { Router } from 'express';
import { asyncHandler } from '../../lib/asyncHandler.js';
import { requireAuth } from '../../middleware/requireAuth.js';
import { searchEmailsController } from './search.controller.js';

const router = Router();

router.get('/emails', requireAuth, asyncHandler(searchEmailsController));

export default router;
