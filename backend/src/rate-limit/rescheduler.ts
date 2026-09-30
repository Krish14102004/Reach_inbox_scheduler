/**
 * FILE: backend/src/rate-limit/rescheduler.ts
 * PHASE: 4 - Rate Limiting, Delay & Concurrency
 * PURPOSE: Moves a rate-limited job to the next hour window (job.moveToDelayed + DelayedError) with rank-based offset to preserve ordering; updates scheduledAt in DB. Never drops or fails jobs.
 */

import { redisClient } from '../lib/redis.js';
import { getNextHourWindowStart } from '../lib/time.js';

const reserveRankScript = `
local rank = redis.call('INCR', KEYS[1])
if rank == 1 then
  redis.call('EXPIRE', KEYS[1], tonumber(ARGV[1]))
end
return rank - 1
`;

export function getRescheduledTime(date: Date, rank = 0, delayBetweenMs = 0): Date {
  return new Date(getNextHourWindowStart(date).getTime() + Math.max(0, rank) * Math.max(0, delayBetweenMs));
}

export async function reserveRescheduleRank(
  senderId: string,
  nextWindowStart: Date,
  now = new Date(),
): Promise<number> {
  const key = `reschedule:${senderId}:${nextWindowStart.toISOString()}`;
  const expiresAt = nextWindowStart.getTime() + 60 * 60 * 1000;
  const ttlSeconds = Math.max(1, Math.ceil((expiresAt - now.getTime()) / 1000));
  const rank = await redisClient.eval(reserveRankScript, 1, key, ttlSeconds);

  return Number(rank);
}
