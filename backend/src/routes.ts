/**
 * FILE: backend/src/routes.ts
 * PHASE: 1 - Backend Foundation
 * PURPOSE: Central router: mounts /api/auth, /api/emails, /api/senders, /api/slack, /api/search, /health.
 */

import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from './lib/asyncHandler.js';
import { checkPrismaHealth, prisma } from './lib/prisma.js';
import { checkRedisHealth, redisClient } from './lib/redis.js';
import authRoutes from './modules/auth/auth.routes.js';
import emailsRoutes from './modules/emails/emails.routes.js';
import searchRoutes from './modules/search/search.routes.js';
import sendersRoutes from './modules/senders/senders.routes.js';
import { validate } from './middleware/validate.js';

const router = Router();

router.use('/api/auth', authRoutes);
router.use('/api/emails', emailsRoutes);
router.use('/api/senders', sendersRoutes);
router.use('/api/search', searchRoutes);

router.get(
  '/health',
  asyncHandler(async (_req, res) => {
    const db = await checkPrismaHealth();
    const redis = await checkRedisHealth();
    const ok = db === 'ok' && redis === 'ok';

    res.status(ok ? 200 : 503).json({
      status: ok ? 'ok' : 'degraded',
      db,
      redis,
      timestamp: new Date().toISOString(),
    });
  }),
);

router.get(
  '/api/health',
  asyncHandler(async (_req, res) => {
    res.redirect(302, '/health');
  }),
);

router.post(
  '/api/_debug/validate',
  validate(
    z.object({
      name: z.string().min(2),
    }),
  ),
  asyncHandler(async (_req, res) => {
    res.json({ ok: true });
  }),
);

router.get(
  '/api/_debug/db',
  asyncHandler(async (_req, res) => {
    const row = await prisma.$queryRaw<{ count: bigint }[]>`SELECT COUNT(*) as count FROM INFORMATION_SCHEMA.TABLES`;
    res.json({ rowCount: Number(row[0]?.count ?? 0) });
  }),
);

router.get(
  '/api/_debug/redis',
  asyncHandler(async (_req, res) => {
    const pong = await redisClient.ping();
    res.json({ pong });
  }),
);

export default router;
