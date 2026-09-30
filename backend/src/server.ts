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
import { runStartupReconciler } from './queue/reconciler.js';
import { mountBullBoard } from './queue/bullBoard.js';
import { ensureIndex } from './search/indexer.js';

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

async function handleListenError(error: NodeJS.ErrnoException): Promise<void> {
  if (error.code === 'EADDRINUSE') {
    logger.error({ port: env.PORT }, 'Backend port is already in use; stop the existing backend instance before starting another');
  } else {
    logger.error({ err: error, port: env.PORT }, 'Failed to listen for API requests');
  }

  await closeRedisClient(redisClient).catch(() => undefined);
  await disconnectPrisma().catch(() => undefined);
  process.exit(1);
}

async function startServer(): Promise<void> {
  try {
    await prisma.$connect();
    await redisClient.connect();
    await runStartupReconciler();
    await ensureIndex();
    await mountBullBoard(app);

    server = app.listen(env.PORT);
    server.once('listening', () => {
      logger.info({ port: env.PORT }, 'Server started');
    });
    server.once('error', (error: NodeJS.ErrnoException) => {
      void handleListenError(error);
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
