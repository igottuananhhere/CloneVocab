import { PrismaClient } from '@prisma/client';

/**
 * Next.js va NestJS deu hot-reload trong che do dev, moi lan reload lai tao mot
 * PrismaClient moi va Postgres nhanh chong het connection slot. Giu instance tren
 * globalThis de mot tien trinh chi bao gio co dung mot client.
 */
const globalForPrisma = globalThis as unknown as { __flashcardPrisma?: PrismaClient };

function createClient(): PrismaClient {
  return new PrismaClient({
    log:
      process.env.NODE_ENV === 'production'
        ? ['warn', 'error']
        : ['query', 'info', 'warn', 'error'],
  });
}

export const prisma: PrismaClient = globalForPrisma.__flashcardPrisma ?? createClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.__flashcardPrisma = prisma;
}
