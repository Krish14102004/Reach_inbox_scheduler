/**
 * FILE: backend/src/worker.ts
 * PHASE: 3 - Core Scheduler (BullMQ + Ethereal)
 * PURPOSE: Worker process entrypoint: starts BullMQ email worker (configurable concurrency), graceful close on shutdown. Separate from API so it can be scaled/restarted independently.
 */

import { createEmailWorker } from './queue/email.processor.js';
import { logger } from './lib/logger.js';
import { closeRedisClient, redisClient } from './lib/redis.js';

let worker: ReturnType<typeof createEmailWorker> | undefined;

async function shutdown(signal: NodeJS.Signals): Promise<void> {
  logger.info({ signal }, 'Shutting down email worker');
  await worker?.close();
  await closeRedisClient(redisClient);
  process.exit(0);
}

async function startWorker(): Promise<void> {
  await redisClient.connect();
  worker = createEmailWorker();

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));

  logger.info('Email worker started');
}

void startWorker().catch(async (error: unknown) => {
  logger.error({ err: error }, 'Failed to start email worker');
  await closeRedisClient(redisClient).catch(() => undefined);
  process.exit(1);
});
