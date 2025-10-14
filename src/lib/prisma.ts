// src/lib/prisma.ts
import { PrismaClient } from '@prisma/client';
import Logger from '../utils/logger';

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

// Prevent multiple instances of Prisma Client in development
const prisma =
  globalThis.__prisma ||
  new PrismaClient({
    log: [
      {
        emit: 'event',
        level: 'query',
      },
      {
        emit: 'event',
        level: 'error',
      },
      {
        emit: 'event',
        level: 'info',
      },
      {
        emit: 'event',
        level: 'warn',
      },
    ],
  });

// Log database queries in development
if (process.env.NODE_ENV === 'development') {
  (prisma as any).$on(
    'query',
    (e: { query: any; params: any; duration: any }) => {
      Logger.debug(`Query: ${e.query}`);
      Logger.debug(`Params: ${e.params}`);
      Logger.debug(`Duration: ${e.duration}ms`);
    }
  );

  (prisma as any).$on('error', (e: { message: any }) => {
    Logger.error(`Database error: ${e.message}`);
  });
}

if (process.env.NODE_ENV === 'development') {
  globalThis.__prisma = prisma;
}

export default prisma;
