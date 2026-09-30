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

const atomicLimitScript = `
local current = tonumber(redis.call('GET', KEYS[1]) or '0')
local limit = tonumber(ARGV[1])
if current >= limit then
  return {0, current}
end
current = redis.call('INCR', KEYS[1])
if current == 1 then
  redis.call('EXPIRE', KEYS[1], tonumber(ARGV[2]))
end
return {1, current}
`;

export async function checkRateLimit(senderId: string, limit: number, now = new Date()): Promise<RateLimitResult> {
  const windowKey = getHourWindowKey(now, `rate:${senderId}`);
  const nextWindowStart = getNextHourWindowStart(now);
  const ttlSeconds = Math.max(1, Math.ceil((nextWindowStart.getTime() - now.getTime()) / 1000));
  const [allowed, currentCount] = await redisClient.eval(
    atomicLimitScript,
    1,
    windowKey,
    limit,
    ttlSeconds,
  ) as [number, number];

  return {
    allowed: allowed === 1,
    currentCount,
    limit,
    nextWindowStart,
  };
}
