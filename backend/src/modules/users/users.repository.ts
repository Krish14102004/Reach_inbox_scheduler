/**
 * FILE: backend/src/modules/users/users.repository.ts
 * PHASE: 2 - Authentication (Google OAuth)
 * PURPOSE: Prisma queries for User: upsertByGoogleId, findById.
 */

import { prisma } from '../../lib/prisma.js';

export const usersRepository = {
  async upsertByGoogleId(input: {
    googleId: string;
    email: string;
    name: string;
    avatarUrl?: string | null;
  }) {
    return prisma.user.upsert({
      where: { googleId: input.googleId },
      update: {
        email: input.email,
        name: input.name,
        avatarUrl: input.avatarUrl ?? null,
      },
      create: {
        googleId: input.googleId,
        email: input.email,
        name: input.name,
        avatarUrl: input.avatarUrl ?? null,
      },
    });
  },

  async findById(id: string) {
    return prisma.user.findUnique({
      where: { id },
    });
  },
};
