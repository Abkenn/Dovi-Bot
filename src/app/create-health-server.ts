import { pingDatabase } from '@data/queries/database-health';
import { serveStatic } from '@hono/node-server/serve-static';
import { Hono } from 'hono';
import { BOT_GUILDS } from '../config/discord-access';
import { getCachedEmbeddedAppStats } from '../modules/embedded-app/embedded-app-stats-cache.service';
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

  app.get('/api/embedded-app/stats', async (c) => {
    c.header('Cache-Control', 'no-store');
    return c.json(await getCachedEmbeddedAppStats(BOT_GUILDS.STAGING_ENV));
  });

  app.get('/embedded-app', (c) => c.redirect('/embedded-app/'));
  app.use(
    '/embedded-app/*',
    serveStatic({
      root: './embedded-app/dist',
      rewriteRequestPath: (path) => path.slice('/embedded-app'.length),
      onFound: (_path, c) => {
        c.header('Cache-Control', 'public, max-age=3600');
      },
    }),
  );

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
