/**
 * FILE: backend/src/worker.ts
 * PHASE: 3 - Core Scheduler (BullMQ + Ethereal)
 * PURPOSE: Worker process entrypoint: starts BullMQ email worker (configurable concurrency), graceful close on shutdown. Separate from API so it can be scaled/restarted independently.
 */

import { createEmailWorker } from './queue/email.processor.js';
import { logger } from './lib/logger.js';

const worker = createEmailWorker();

async function shutdown(signal: NodeJS.Signals): Promise<void> {
  logger.info({ signal }, 'Shutting down email worker');
  await worker.close();
  process.exit(0);
}

process.on('SIGINT', () => {
  void shutdown('SIGINT');
});
process.on('SIGTERM', () => {
  void shutdown('SIGTERM');
});

logger.info('Email worker started');
