import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is not set');
}

const globalForPrisma = globalThis as typeof globalThis & {
  prisma?: PrismaClient;
};

const prismaClientSingleton = () =>
  new PrismaClient({
    adapter: new PrismaPg({
      connectionString: databaseUrl,
    }),
    log: ['warn', 'error'],
  });

export const prisma = globalForPrisma.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
