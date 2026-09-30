/**
 * FILE: backend/src/middleware/requireAuth.ts
 * PHASE: 2 - Authentication (Google OAuth)
 * PURPOSE: Verifies session cookie (JWT), loads user, attaches req.user; 401 otherwise.
 */

import type { NextFunction, Request, Response } from 'express';
import { COOKIE_NAME } from '../config/constants.js';
import { UnauthorizedError } from '../lib/errors.js';
import { usersRepository } from '../modules/users/users.repository.js';
import { verifySession } from '../modules/auth/session.js';

export async function requireAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const token = req.cookies?.[COOKIE_NAME];

  if (!token) {
    next(new UnauthorizedError('Authentication required.'));
    return;
  }

  try {
    const session = verifySession(token);
    const user = await usersRepository.findById(session.id);

    if (!user) {
      next(new UnauthorizedError('Session user not found.'));
      return;
    }

    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
    };
    next();
  } catch {
    next(new UnauthorizedError('Invalid or expired session.'));
  }
}
