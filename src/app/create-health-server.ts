import { Hono } from 'hono';
import { prisma } from '../lib/prisma';

export function createHealthServer() {
  const app = new Hono();

  app.get('/', (c) => c.text('ok'));
  app.get('/health', async (c) => {
    try {
      await prisma.$queryRaw`select 1`;
      return c.json({ status: 'ok', database: 'ok' });
    } catch {
      return c.json({ status: 'ok', database: 'sleepy' }, 200);
    }
  });

  return app;
}
