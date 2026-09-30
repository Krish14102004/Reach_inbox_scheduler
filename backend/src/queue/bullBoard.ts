/**
 * FILE: backend/src/queue/bullBoard.ts
 * PHASE: 6 - Search (Elasticsearch) & Queue Dashboard
 * PURPOSE: Mounts Bull Board (@bull-board/express) at /admin/queues behind requireAuth for live queue visibility.
 */

import type { Express } from 'express';
import { emailQueue } from './email.queue.js';

export async function mountBullBoard(app: Express): Promise<void> {
  try {
    const { createBullBoard } = await import('@bull-board/api');
    const { ExpressAdapter } = await import('@bull-board/express');

    const serverAdapter = new ExpressAdapter();
    serverAdapter.setBasePath('/admin/queues');

    createBullBoard({
      queues: [emailQueue as any],
      serverAdapter,
    });

    app.use('/admin/queues', serverAdapter.getRouter());
  } catch {
    // Bull Board is optional in local development; it can be installed later if needed.
  }
}
