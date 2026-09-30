/**
 * FILE: backend/src/modules/auth/auth.controller.ts
 * PHASE: 2 - Authentication (Google OAuth)
 * PURPOSE: HTTP layer for auth routes: redirects, sets/clears httpOnly cookie, returns current user.
 */

import type { Request, Response } from 'express';
import { randomBytes } from 'node:crypto';
import { env } from '../../config/env.js';
import { BadRequestError, UnauthorizedError } from '../../lib/errors.js';
import { COOKIE_NAME } from '../../config/constants.js';
import { redisClient } from '../../lib/redis.js';
import { completeGoogleLogin, getGoogleLoginUrl } from './auth.service.js';
import { getCookieOptionsWithClear, sessionCookieOptions } from './session.js';

export async function startGoogleAuth(_req: Request, res: Response): Promise<void> {
  const state = randomBytes(32).toString('hex');
  await redisClient.set(`google:oauth:state:${state}`, 'valid', 'EX', 600, 'NX');
  const loginUrl = await getGoogleLoginUrl(state);
  res.redirect(loginUrl);
}

export async function handleGoogleCallback(req: Request, res: Response): Promise<void> {
  const code = typeof req.query.code === 'string' ? req.query.code : undefined;
  const state = typeof req.query.state === 'string' ? req.query.state : undefined;

  if (!code || !state) {
    throw new BadRequestError('Google OAuth callback code or state is missing.');
  }

  const validState = await redisClient.eval(
    "local value = redis.call('GET', KEYS[1]); if value then redis.call('DEL', KEYS[1]); end; return value",
    1,
    `google:oauth:state:${state}`,
  );
  if (validState !== 'valid') {
    throw new UnauthorizedError('Google OAuth state is invalid or expired.');
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
