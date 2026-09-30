/**
 * FILE: backend/src/lib/asyncHandler.ts
 * PHASE: 1 - Backend Foundation
 * PURPOSE: Wrapper that forwards rejected promises from async route handlers to the error middleware.
 */

import type { NextFunction, Request, Response } from 'express';

export function asyncHandler(
  handler: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    void handler(req, res, next).catch(next);
  };
}
