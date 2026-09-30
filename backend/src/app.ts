/**
 * FILE: backend/src/app.ts
 * PHASE: 1 - Backend Foundation
 * PURPOSE: Express app factory: helmet, cors (credentials), cookie-parser, JSON body limit, request logger, routes, notFound + central error handler.
 */

import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';
import { env } from './config/env.js';
import { errorHandler } from './middleware/errorHandler.js';
import { notFound } from './middleware/notFound.js';
import { requestLogger } from './middleware/requestLogger.js';
import routes from './routes.js';

export function createApp(): Express {
  const app = express();

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(
    cors({
      origin: env.FRONTEND_URL,
      credentials: true,
    }),
  );
  app.use(cookieParser());
  app.use(express.json({ limit: '1mb' }));
  app.use(requestLogger);
  app.use(routes);
  app.use(notFound);
  app.use(errorHandler);

  return app;
}
