import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

export const withDbRetry = async (fn, maxRetries = 3, delayMs = 1500) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const isConnectionError =
        err.message?.includes('timeout') ||
        err.message?.includes('Topology') ||
        err.message?.includes('Server selection') ||
        err.code === 'P2010';

      if (isConnectionError && attempt < maxRetries) {
        console.warn(`[SMOMS DB Retry] Connection attempt ${attempt}/${maxRetries} failed. Retrying in ${delayMs}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      } else {
        throw err;
      }
    }
  }
};

export default prisma;
