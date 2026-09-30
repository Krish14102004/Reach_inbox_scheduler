/**
 * FILE: backend/src/queue/queue.connection.ts
 * PHASE: 3 - Core Scheduler (BullMQ + Ethereal)
 * PURPOSE: BullMQ connection options + default job options (attempts, exponential backoff, removeOnComplete policy).
 */

import { type ConnectionOptions } from 'bullmq';
import { env } from '../config/env.js';

const redisUrl = new URL(env.REDIS_URL);

export const queueConnection: ConnectionOptions = {
  host: redisUrl.hostname,
  port: Number(redisUrl.port || 6379),
  username: redisUrl.username || undefined,
  password: redisUrl.password || undefined,
  db: Number(redisUrl.pathname.replace('/', '') || 0),
  maxRetriesPerRequest: null,
};

export const defaultJobOptions = {
  attempts: env.MAX_ATTEMPTS,
  backoff: {
    type: 'exponential' as const,
    delay: 2000,
  },
  removeOnComplete: true,
  removeOnFail: false,
};
