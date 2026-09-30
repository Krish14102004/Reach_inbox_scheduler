/**
 * FILE: backend/src/middleware/notFound.ts
 * PHASE: 1 - Backend Foundation
 * PURPOSE: 404 handler for unknown routes.
 */

import type { NextFunction, Request, Response } from 'express';
import { NotFoundError } from '../lib/errors.js';

export function notFound(req: Request, _res: Response, next: NextFunction): void {
  next(new NotFoundError(`Route not found: ${req.method} ${req.originalUrl}`));
}
