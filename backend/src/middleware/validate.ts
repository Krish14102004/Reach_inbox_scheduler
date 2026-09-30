/**
 * FILE: backend/src/middleware/validate.ts
 * PHASE: 1 - Backend Foundation
 * PURPOSE: Generic zod validation middleware for body/query/params; attaches typed result to req.
 */

import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { BadRequestError } from '../lib/errors.js';

type ValidationSource = 'body' | 'query' | 'params';

export function validate<TSchema extends z.ZodTypeAny>(
  schema: TSchema,
  source: ValidationSource = 'body',
) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const value = req[source];
    const parsed = schema.safeParse(value);

    if (!parsed.success) {
      next(
        new BadRequestError('Validation failed.', {
          fieldErrors: parsed.error.flatten().fieldErrors,
        }),
      );
      return;
    }

    const requestWithValue = req as Request & Record<ValidationSource, unknown>;
    requestWithValue[source] = parsed.data;
    next();
  };
}
