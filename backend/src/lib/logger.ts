/**
 * FILE: backend/src/lib/logger.ts
 * PHASE: 1 - Backend Foundation
 * PURPOSE: Pino logger (pretty in dev, JSON in prod) with child-logger helper for modules/jobs.
 */

import pino from 'pino';
import { env } from '../config/env.js';

export const logger = pino({
  level: env.NODE_ENV === 'production' ? 'info' : 'debug',
  timestamp: pino.stdTimeFunctions.isoTime,
});

export const createChildLogger = (bindings: Record<string, unknown>) => logger.child(bindings);

export default logger;
