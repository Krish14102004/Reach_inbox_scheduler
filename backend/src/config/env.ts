/**
 * FILE: backend/src/config/env.ts
 * PHASE: 1 - Backend Foundation
 * PURPOSE: Zod-validated environment loader. Fails fast at boot with a readable error. Single typed `env` export; no process.env elsewhere.
 */

import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  FRONTEND_URL: z.string().trim().min(1).default('http://localhost:5173'),
  DATABASE_URL: z.string().trim().min(1, 'DATABASE_URL is required'),
  REDIS_URL: z.string().trim().min(1).default('redis://localhost:6379'),
  ELASTICSEARCH_URL: z.string().trim().min(1).default('http://localhost:9200'),
  JWT_SECRET: z.string().trim().min(32).optional(),
  COOKIE_DOMAIN: z.string().trim().optional(),
  GOOGLE_CLIENT_ID: z.string().trim().optional(),
  GOOGLE_CLIENT_SECRET: z.string().trim().optional(),
  GOOGLE_REDIRECT_URI: z.string().trim().optional(),
  SLACK_CLIENT_ID: z.string().trim().optional(),
  SLACK_CLIENT_SECRET: z.string().trim().optional(),
  SLACK_REDIRECT_URI: z.string().trim().optional(),
  ETHEREAL_ALLOW_SELF_SIGNED_CERTS: z.preprocess((value) => {
    if (typeof value === 'string') {
      const normalized = value.toLowerCase();
      if (normalized === 'true') return true;
      if (normalized === 'false') return false;
    }
    return value;
  }, z.boolean().default(false)),
  WORKER_CONCURRENCY: z.coerce.number().int().positive().default(5),
  MIN_DELAY_BETWEEN_EMAILS_MS: z.coerce.number().int().nonnegative().default(2000),
  MAX_EMAILS_PER_HOUR_PER_SENDER: z.coerce.number().int().positive().default(200),
  MAX_ATTEMPTS: z.coerce.number().int().positive().default(5),
  PROCESSING_STALE_AFTER_MS: z.coerce.number().int().positive().default(300_000),
  BULL_BOARD_ENABLED: z.preprocess((value) => {
    if (typeof value === 'string') {
      const normalized = value.toLowerCase();
      if (normalized === 'true') return true;
      if (normalized === 'false') return false;
    }
    return value;
  }, z.boolean().default(true)),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const details = parsed.error.issues
    .map((issue) => `- ${issue.path.join('.') || 'env'}: ${issue.message}`)
    .join('\n');

  throw new Error(`Invalid environment configuration:\n${details}`);
}

export const env = parsed.data;
export type AppEnv = typeof env;
