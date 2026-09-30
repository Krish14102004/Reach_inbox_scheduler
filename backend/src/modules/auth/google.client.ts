/**
 * FILE: backend/src/modules/auth/google.client.ts
 * PHASE: 2 - Authentication (Google OAuth)
 * PURPOSE: google-auth-library OAuth2 client wrapper (auth URL with state, token exchange, ID-token verification).
 */

import { OAuth2Client } from 'google-auth-library';
import { env } from '../../config/env.js';
import { BadRequestError } from '../../lib/errors.js';

export const googleOAuthClient = new OAuth2Client(
  env.GOOGLE_CLIENT_ID ?? '',
  env.GOOGLE_CLIENT_SECRET ?? '',
  env.GOOGLE_REDIRECT_URI ?? '',
);

export function buildGoogleAuthUrl(state: string): string {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_REDIRECT_URI) {
    throw new BadRequestError('Google OAuth is not configured yet.');
  }

  return googleOAuthClient.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: ['openid', 'email', 'profile'],
    state,
  });
}

export async function verifyGoogleCode(code: string): Promise<{
  googleId: string;
  email: string;
  name: string;
  avatarUrl?: string | null;
}> {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_REDIRECT_URI || !env.GOOGLE_CLIENT_SECRET) {
    throw new BadRequestError('Google OAuth is not configured yet.');
  }

  if (!code || !code.trim()) {
    throw new BadRequestError('Google OAuth code is required.');
  }

  const { tokens } = await googleOAuthClient.getToken(code);
  const idToken = tokens.id_token;

  if (!idToken) {
    throw new BadRequestError('Google did not return an id_token.');
  }

  const ticket = await googleOAuthClient.verifyIdToken({
    idToken,
    audience: env.GOOGLE_CLIENT_ID,
  });

  const payload = ticket.getPayload();

  if (!payload?.sub || !payload.email) {
    throw new BadRequestError('Google user payload is invalid.');
  }

  const name = payload.name ?? payload.email.split('@')[0];

  if (!name) {
    throw new BadRequestError('Google user name could not be resolved.');
  }

  return {
    googleId: payload.sub,
    email: payload.email,
    name,
    avatarUrl: payload.picture ?? null,
  };
}
