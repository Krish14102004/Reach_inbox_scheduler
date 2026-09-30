import { Router } from 'express';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { env } from '../config/env.js';
import { logger } from '../lib/logger.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { emailQueue } from './email.queue.js';

export function getBullBoardRouter(): Router {
  const router = Router();
  if (!env.BULL_BOARD_ENABLED) return router;

  try {
    const serverAdapter = new ExpressAdapter();
    serverAdapter.setBasePath('/admin/queues');

    createBullBoard({
      queues: [new BullMQAdapter(emailQueue)],
      serverAdapter,
    });

    router.use('/admin/queues', requireAuth, serverAdapter.getRouter());
  } catch (error) {
    logger.warn({ err: error }, 'Bull Board could not be mounted');
  }

  return router;
}

export async function mountBullBoard(): Promise<void> {
  // Kept for backward compatibility
}
