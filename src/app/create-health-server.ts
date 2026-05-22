import { Hono } from 'hono';
import { prisma } from '../lib/prisma';
import { getRuntimeHealth } from './runtime-health';

const DATABASE_HEALTH_CACHE_MS = 60_000;

let databaseHealth:
  | {
      status: 'ok' | 'sleepy';
      checkedAt: number;
    }
  | undefined;
let pendingDatabaseHealthCheck: Promise<'ok' | 'sleepy'> | undefined;

const getDatabaseHealth = async () => {
  const now = Date.now();

  if (
    databaseHealth &&
    now - databaseHealth.checkedAt < DATABASE_HEALTH_CACHE_MS
  ) {
    return databaseHealth.status;
  }

  if (!pendingDatabaseHealthCheck) {
    pendingDatabaseHealthCheck = prisma.$queryRaw`select 1`
      .then(() => 'ok' as const)
      .catch(() => 'sleepy' as const)
      .then((status) => {
        databaseHealth = {
          status,
          checkedAt: Date.now(),
        };

        return status;
      })
      .finally(() => {
        pendingDatabaseHealthCheck = undefined;
      });
  }

  return pendingDatabaseHealthCheck;
};

export function createHealthServer() {
  const app = new Hono();

  app.get('/', (c) => c.text('ok'));
  app.get('/health', async (c) => {
    const runtimeHealth = getRuntimeHealth();
    const isDiscordReady = runtimeHealth.discord.status === 'ready';
    const database = isDiscordReady ? await getDatabaseHealth() : 'unchecked';

    return c.json(
      {
        status: isDiscordReady ? 'ok' : 'unhealthy',
        database,
        discord: runtimeHealth.discord,
      },
      isDiscordReady ? 200 : 503,
    );
  });

  return app;
}
