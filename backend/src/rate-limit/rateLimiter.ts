/**
 * FILE: backend/src/rate-limit/rateLimiter.ts
 * PHASE: 4 - Rate Limiting, Delay & Concurrency
 * PURPOSE: Redis-backed hourly limiter keyed by sender + hour window. Atomic Lua INCR-if-below. Returns {allowed, nextWindowStart}. Safe across many workers/instances.
 */

export {};
