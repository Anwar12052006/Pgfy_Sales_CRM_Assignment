import { PrismaClient, Prisma, Role, LeadStatus, CallOutcome, FollowUpStatus } from '../../generated/prisma/client.js';

// Global singleton declaration to avoid multiple client instances during hot-reloads
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env['NODE_ENV'] === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
  });

if (process.env['NODE_ENV'] !== 'production') {
  globalForPrisma.prisma = prisma;
}

// Re-export models, client and enums for convenience across services
export { PrismaClient, Prisma, Role, LeadStatus, CallOutcome, FollowUpStatus };
export default prisma;
