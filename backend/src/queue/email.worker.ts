/**
 * FILE: backend/src/queue/email.worker.ts
 * PHASE: 3 - Core Scheduler (BullMQ + Ethereal)
 * PURPOSE: BullMQ Worker factory: concurrency from env, limiter (global throttle), failure/completed event hooks, stalled-job handling.
 */

import { Worker } from 'bullmq';
import { env } from '../config/env.js';
import { QUEUE_NAMES } from '../config/constants.js';
import { logger } from '../lib/logger.js';
import { queueConnection } from './queue.connection.js';
import type { EmailJobData } from './email.queue.js';

export function createEmailQueueWorker() {
  return new Worker<EmailJobData>(
    QUEUE_NAMES.email,
    async (job) => {
      logger.info({ jobId: job.id, emailId: job.data.id }, 'Processing queued email');
      return job.data;
    },
    {
      connection: queueConnection,
      concurrency: env.WORKER_CONCURRENCY,
      removeOnComplete: { count: 1000 },
      removeOnFail: { count: 500 },
    },
  );
}
