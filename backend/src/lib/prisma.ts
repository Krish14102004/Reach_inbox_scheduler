/**
 * FILE: backend/src/lib/prisma.ts
 * PHASE: 1 - Backend Foundation
 * PURPOSE: Singleton PrismaClient + disconnect helper.
 */

import { PrismaClient } from '@prisma/client';
import { env } from '../config/env.js';

const globalForPrisma = globalThis as typeof globalThis & {
  prisma?: PrismaClient;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasourceUrl: env.DATABASE_URL,
    log: env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export async function disconnectPrisma(): Promise<void> {
  await prisma.$disconnect();
}

export async function checkPrismaHealth(): Promise<'ok' | 'down'> {
  try {
    await prisma.$queryRaw`SELECT 1 as ok`;
    return 'ok';
  } catch {
    return 'down';
  }
}
