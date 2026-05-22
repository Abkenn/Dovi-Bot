import { Hono } from 'hono';
import { prisma } from '../lib/prisma';
import { getRuntimeHealth } from './runtime-health';

export function createHealthServer() {
  const app = new Hono();

  app.get('/', (c) => c.text('ok'));
  app.get('/health', async (c) => {
    const runtimeHealth = getRuntimeHealth();
    const isDiscordReady = runtimeHealth.discord.status === 'ready';

    try {
      await prisma.$queryRaw`select 1`;
      return c.json(
        {
          status: isDiscordReady ? 'ok' : 'unhealthy',
          database: 'ok',
          discord: runtimeHealth.discord,
        },
        isDiscordReady ? 200 : 503,
      );
    } catch {
      return c.json(
        {
          status: isDiscordReady ? 'ok' : 'unhealthy',
          database: 'sleepy',
          discord: runtimeHealth.discord,
        },
        isDiscordReady ? 200 : 503,
      );
    }
  });

  return app;
}
