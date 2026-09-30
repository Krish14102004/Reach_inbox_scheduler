/**
 * FILE: backend/src/queue/bullBoard.ts
 * PHASE: 6 - Search (Elasticsearch) & Queue Dashboard
 * PURPOSE: Mounts Bull Board (@bull-board/express) at /admin/queues behind requireAuth for live queue visibility.
 */

import type { Express } from 'express';
import { env } from '../config/env.js';
import { logger } from '../lib/logger.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { emailQueue } from './email.queue.js';

export async function mountBullBoard(app: Express): Promise<void> {
  if (!env.BULL_BOARD_ENABLED) return;

  try {
    const { createBullBoard } = await import('@bull-board/api');
    const { BullMQAdapter } = await import('@bull-board/api/bullMQAdapter');
    const { ExpressAdapter } = await import('@bull-board/express');

    const serverAdapter = new ExpressAdapter();
    serverAdapter.setBasePath('/admin/queues');

    createBullBoard({
      queues: [new BullMQAdapter(emailQueue)],
      serverAdapter,
    });

    app.use('/admin/queues', requireAuth, serverAdapter.getRouter());
  } catch (error) {
    logger.warn({ err: error }, 'Bull Board could not be mounted');
  }
}
