/**
 * FILE: backend/src/modules/auth/auth.service.ts
 * PHASE: 2 - Authentication (Google OAuth)
 * PURPOSE: Exchange Google auth code -> verify ID token -> upsert user -> issue session JWT.
 */

import { BadRequestError } from '../../lib/errors.js';
import { usersRepository } from '../users/users.repository.js';
import { buildGoogleAuthUrl, verifyGoogleCode } from './google.client.js';
import { signSession, type SessionUser } from './session.js';

export async function getGoogleLoginUrl(state: string): Promise<string> {
  return buildGoogleAuthUrl(state);
}

export async function completeGoogleLogin(code: string): Promise<{ user: SessionUser & { id: string }; token: string }> {
  if (!code || !code.trim()) {
    throw new BadRequestError('Google OAuth code is required.');
  }

  const profile = await verifyGoogleCode(code);
  const user = await usersRepository.upsertByGoogleId(profile);
  const sessionUser: SessionUser = {
    id: user.id,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl,
  };

  return {
    user: sessionUser,
    token: signSession(sessionUser),
  };
}
