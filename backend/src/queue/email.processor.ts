/**
 * FILE: backend/src/queue/email.processor.ts
 * PHASE: 3 - Core Scheduler (BullMQ + Ethereal)
 * PURPOSE: Job handler: claim email atomically -> rate-limit + send-gate check (P4) -> send via Ethereal -> mark sent -> update ES. Idempotent: skips if already sent/processing.
 */

export {};
