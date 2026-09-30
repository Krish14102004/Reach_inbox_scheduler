/**
 * FILE: backend/src/rate-limit/rateLimiter.ts
 * PHASE: 4 - Rate Limiting, Delay & Concurrency
 * PURPOSE: Redis-backed hourly limiter keyed by sender + hour window. Atomic Lua INCR-if-below. Returns {allowed, nextWindowStart}. Safe across many workers/instances.
 */

import { redisClient } from '../lib/redis.js';
import { getHourWindowKey, getNextHourWindowStart } from '../lib/time.js';

export interface RateLimitResult {
  allowed: boolean;
  currentCount: number;
  limit: number;
  nextWindowStart: Date;
}

export async function checkRateLimit(senderId: string, limit: number, now = new Date()): Promise<RateLimitResult> {
  const windowKey = getHourWindowKey(now, `rate:${senderId}`);
  const nextWindowStart = getNextHourWindowStart(now);
  const currentCount = await redisClient.incr(windowKey);

  if (currentCount === 1) {
    await redisClient.expire(windowKey, 60 * 60);
  }

  return {
    allowed: currentCount <= limit,
    currentCount,
    limit,
    nextWindowStart,
  };
}
