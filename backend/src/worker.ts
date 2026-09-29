/**
 * FILE: backend/src/worker.ts
 * PHASE: 3 - Core Scheduler (BullMQ + Ethereal)
 * PURPOSE: Worker process entrypoint: starts BullMQ email worker (configurable concurrency), graceful close on shutdown. Separate from API so it can be scaled/restarted independently.
 */

export {};
