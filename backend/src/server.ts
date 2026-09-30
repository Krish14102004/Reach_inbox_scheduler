/**
 * FILE: backend/src/server.ts
 * PHASE: 1 - Backend Foundation
 * PURPOSE: API process entrypoint: boots Express, connects Prisma/Redis, runs startup reconciler, mounts Bull Board, handles graceful shutdown (SIGTERM/SIGINT).
 */

import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './lib/logger.js';
import { disconnectPrisma, prisma } from './lib/prisma.js';
import { closeRedisClient, redisClient } from './lib/redis.js';

const app = createApp();
let server: ReturnType<typeof import('http').createServer> | undefined;

async function shutdown(signal: NodeJS.Signals): Promise<void> {
  logger.info({ signal }, 'Shutting down server');

  if (server) {
    await new Promise<void>((resolve, reject) => {
      server?.close((error?: Error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
  }

  await closeRedisClient(redisClient);
  await disconnectPrisma();
  logger.info('Graceful shutdown complete');
  process.exit(0);
}

async function startServer(): Promise<void> {
  try {
    await prisma.$connect();
    await redisClient.connect();

    server = app.listen(env.PORT, () => {
      logger.info({ port: env.PORT }, 'Server started');
    });

    process.on('SIGINT', () => {
      void shutdown('SIGINT');
    });
    process.on('SIGTERM', () => {
      void shutdown('SIGTERM');
    });
  } catch (error) {
    logger.error({ err: error }, 'Failed to start the server');
    await disconnectPrisma();
    await closeRedisClient(redisClient).catch(() => undefined);
    process.exit(1);
  }
}

void startServer();

export { app, startServer };
