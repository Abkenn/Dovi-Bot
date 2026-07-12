import { pingDatabase } from '@data/queries/database-health';
import { serveStatic } from '@hono/node-server/serve-static';
import { Hono } from 'hono';
import { getRuntimeHealth } from './runtime-health';
import {
  fetchEmbeddedApp,
  registerEmbeddedAppStatsLoader,
} from './tanstack-start-server';

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
    pendingDatabaseHealthCheck = pingDatabase()
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
  registerEmbeddedAppStatsLoader();

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

  app.use(
    '*',
    serveStatic({
      root: './embedded-app/dist/client',
      onFound: (_path, c) => {
        c.header('Cache-Control', 'public, max-age=3600');
      },
    }),
  );
  app.all('*', (c) => fetchEmbeddedApp(c.req.raw));

  return app;
}
