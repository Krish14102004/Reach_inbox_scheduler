/**
 * FILE: backend/src/modules/auth/auth.controller.ts
 * PHASE: 2 - Authentication (Google OAuth)
 * PURPOSE: HTTP layer for auth routes: redirects, sets/clears httpOnly cookie, returns current user.
 */

import type { Request, Response } from 'express';
import { env } from '../../config/env.js';
import { BadRequestError } from '../../lib/errors.js';
import { COOKIE_NAME } from '../../config/constants.js';
import { completeGoogleLogin, getGoogleLoginUrl } from './auth.service.js';
import { getCookieOptionsWithClear, sessionCookieOptions } from './session.js';

export async function startGoogleAuth(req: Request, res: Response): Promise<void> {
  const state = typeof req.query.state === 'string' ? req.query.state : undefined;
  const loginUrl = await getGoogleLoginUrl(state);
  res.redirect(loginUrl);
}

export async function handleGoogleCallback(req: Request, res: Response): Promise<void> {
  const code = typeof req.query.code === 'string' ? req.query.code : undefined;

  if (!code) {
    throw new BadRequestError('Google OAuth callback code is missing.');
  }

  const { token } = await completeGoogleLogin(code);
  res.cookie(COOKIE_NAME, token, sessionCookieOptions);

  const frontEndUrl = env.FRONTEND_URL.replace(/\/$/, '');
  res.redirect(`${frontEndUrl}/?auth=success`);
}

export async function getCurrentUser(req: Request, res: Response): Promise<void> {
  res.json({ user: req.user ?? null });
}

export async function logout(_req: Request, res: Response): Promise<void> {
  res.clearCookie(COOKIE_NAME, getCookieOptionsWithClear());
  res.json({ ok: true });
}
