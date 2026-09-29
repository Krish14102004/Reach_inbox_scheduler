/**
 * FILE: backend/src/queue/reconciler.ts
 * PHASE: 3 - Core Scheduler (BullMQ + Ethereal)
 * PURPOSE: Runs once at startup (NOT cron): re-enqueues DB emails still `scheduled` but missing a BullMQ job; resets stuck `processing` rows. Guarantees restart safety.
 */

export {};
