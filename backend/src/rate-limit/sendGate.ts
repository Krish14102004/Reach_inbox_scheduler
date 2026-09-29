/**
 * FILE: backend/src/rate-limit/sendGate.ts
 * PHASE: 4 - Rate Limiting, Delay & Concurrency
 * PURPOSE: Per-sender minimum delay between sends (Redis SET NX PX). Returns ms to wait; processor re-delays the job instead of blocking the worker.
 */

export {};
