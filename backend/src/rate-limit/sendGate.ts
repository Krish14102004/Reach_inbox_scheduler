/**
 * FILE: backend/src/rate-limit/sendGate.ts
 * PHASE: 4 - Rate Limiting, Delay & Concurrency
 * PURPOSE: Per-sender minimum delay between sends (Redis SET NX PX). Returns ms to wait; processor re-delays the job instead of blocking the worker.
 */

import { redisClient } from '../lib/redis.js';

export interface SendGateResult {
  allowed: boolean;
  waitMs: number;
}

export async function acquireSendGate(senderId: string, minDelayMs: number): Promise<SendGateResult> {
  const key = `gate:${senderId}`;
  const acquired = await redisClient.set(key, '1', 'PX', Math.max(1, minDelayMs), 'NX');

  if (!acquired) {
    const ttl = await redisClient.pttl(key);
    return { allowed: false, waitMs: Math.max(0, ttl) };
  }

  return { allowed: true, waitMs: 0 };
}

export async function clearSendGate(senderId: string): Promise<void> {
  await redisClient.del(`gate:${senderId}`);
}
