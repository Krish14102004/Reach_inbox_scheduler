/**
 * FILE: backend/src/middleware/errorHandler.ts
 * PHASE: 1 - Backend Foundation
 * PURPOSE: Central error middleware: maps AppError/ZodError/Prisma errors to a uniform JSON envelope {error:{code,message,details}}. Never leaks stack traces in prod.
 */

import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import type { ErrorRequestHandler } from 'express';
import { z } from 'zod';
import { AppError } from '../lib/errors.js';
import { logger } from '../lib/logger.js';

export const errorHandler: ErrorRequestHandler = (error, req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }

  if (error instanceof AppError) {
    return res.status(error.statusCode).json({
      error: {
        code: error.code,
        message: error.message,
        ...(error.details ? { details: error.details } : {}),
      },
    });
  }

  if (error instanceof z.ZodError) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed.',
        details: error.flatten(),
      },
    });
  }

  if (error instanceof PrismaClientKnownRequestError) {
    logger.error({ err: error, method: req.method, url: req.originalUrl }, 'Prisma request error');
    return res.status(400).json({
      error: {
        code: 'DATABASE_ERROR',
        message: 'A database error occurred.',
        details: { prismaCode: error.code },
      },
    });
  }

  logger.error({ err: error, method: req.method, url: req.originalUrl }, 'Unhandled application error');

  return res.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred.',
    },
  });
};
