/**
 * FILE: backend/src/lib/redis.ts
 * PHASE: 1 - Backend Foundation
 * PURPOSE: ioredis connection factories. BullMQ needs maxRetriesPerRequest=null; separate connections for queue, worker, general use.
 */

import { Redis, type RedisOptions } from 'ioredis';
import { env } from '../config/env.js';

const defaultRedisOptions: RedisOptions = {
  lazyConnect: true,
  maxRetriesPerRequest: null,
  enableReadyCheck: true,
};

export const redisClient = new Redis(env.REDIS_URL, defaultRedisOptions);

export function createRedisClient(url = env.REDIS_URL): Redis {
  return new Redis(url, { ...defaultRedisOptions, lazyConnect: true });
}

export async function checkRedisHealth(): Promise<'ok' | 'down'> {
  try {
    await redisClient.ping();
    return 'ok';
  } catch {
    return 'down';
  }
}

export async function closeRedisClient(client: Redis): Promise<void> {
  await client.quit();
}
