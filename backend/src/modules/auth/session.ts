/**
 * FILE: backend/src/modules/auth/session.ts
 * PHASE: 2 - Authentication (Google OAuth)
 * PURPOSE: Sign/verify session JWT and cookie options (httpOnly, sameSite, secure in prod).
 */

import jwt from 'jsonwebtoken';
import { COOKIE_NAME } from '../../config/constants.js';
import { env } from '../../config/env.js';

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string | null;
}

const JWT_SECRET = env.JWT_SECRET ?? 'reachinbox-dev-secret-key-for-local-dev-only';

export function signSession(user: SessionUser): string {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl ?? null,
    },
    JWT_SECRET,
    {
      expiresIn: '7d',
      issuer: 'reachinbox-scheduler',
    },
  );
}

export function verifySession(token: string): SessionUser {
  const payload = jwt.verify(token, JWT_SECRET, {
    issuer: 'reachinbox-scheduler',
  }) as jwt.JwtPayload & { sub?: string; email?: string; name?: string; avatarUrl?: string | null };

  if (!payload.sub || !payload.email || !payload.name) {
    throw new Error('Invalid session payload.');
  }

  return {
    id: payload.sub,
    email: payload.email,
    name: payload.name,
    avatarUrl: payload.avatarUrl ?? null,
  };
}

export const sessionCookieOptions = {
  httpOnly: true,
  path: '/',
  sameSite: 'lax' as const,
  secure: env.NODE_ENV === 'production',
  maxAge: 1000 * 60 * 60 * 24 * 7,
  ...(env.COOKIE_DOMAIN ? { domain: env.COOKIE_DOMAIN } : {}),
};

export function getCookieOptionsWithClear() {
  return {
    ...sessionCookieOptions,
    maxAge: undefined,
    expires: new Date(0),
  };
}

export { COOKIE_NAME };
