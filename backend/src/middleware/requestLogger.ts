/**
 * FILE: backend/src/middleware/requestLogger.ts
 * PHASE: 1 - Backend Foundation
 * PURPOSE: pino-http request/response logging with request id.
 */

import { pinoHttp } from 'pino-http';
import type { IncomingMessage } from 'node:http';
import { logger } from '../lib/logger.js';

export const requestLogger = pinoHttp({
  logger,
  autoLogging: true,
  genReqId: (req: IncomingMessage) => req.headers['x-request-id']?.toString() ?? crypto.randomUUID(),
});
