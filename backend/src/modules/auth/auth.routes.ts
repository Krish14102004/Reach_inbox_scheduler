/**
 * FILE: backend/src/modules/auth/auth.routes.ts
 * PHASE: 2 - Authentication (Google OAuth)
 * PURPOSE: GET /api/auth/google (start), GET /api/auth/google/callback, GET /api/auth/me, POST /api/auth/logout.
 */

import { Router } from 'express';
import { asyncHandler } from '../../lib/asyncHandler.js';
import { requireAuth } from '../../middleware/requireAuth.js';
import { getCurrentUser, handleGoogleCallback, logout, startGoogleAuth } from './auth.controller.js';

const router = Router();

router.get('/google', asyncHandler(startGoogleAuth));
router.get('/google/callback', asyncHandler(handleGoogleCallback));
router.get('/me', requireAuth, asyncHandler(getCurrentUser));
router.post('/logout', asyncHandler(logout));

export default router;
