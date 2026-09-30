/**
 * FILE: backend/src/config/constants.ts
 * PHASE: 1 - Backend Foundation
 * PURPOSE: Non-secret constants: queue names, Redis key prefixes, status enums, cookie name, ES index name.
 */

export const APP_NAME = 'reachinbox-scheduler';
export const DEFAULT_PORT = 4000;
export const QUEUE_NAMES = {
  email: 'email-queue',
} as const;
export const REDIS_KEY_PREFIXES = {
  rateLimit: 'rl',
  rateLimitRank: 'rl:rank',
  sendGate: 'gate',
  slackNotified: 'slack:notified',
} as const;
export const EMAIL_STATUS = {
  scheduled: 'scheduled',
  processing: 'processing',
  sent: 'sent',
  failed: 'failed',
} as const;
export const COOKIE_NAME = 'reachinbox_session';
export const ELASTICSEARCH_INDEX_NAME = 'emails';
