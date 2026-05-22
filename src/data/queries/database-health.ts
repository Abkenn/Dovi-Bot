import { prisma } from '../../lib/prisma';

export const pingDatabase = () => prisma.$queryRaw`select 1`;
