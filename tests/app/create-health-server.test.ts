import { beforeEach, describe, expect, it, vi } from 'vitest';

const embeddedStats = vi.hoisted(() => ({
  getCachedEmbeddedAppStats: vi.fn(),
}));
const database = vi.hoisted(() => ({ pingDatabase: vi.fn() }));
const runtime = vi.hoisted(() => ({ getRuntimeHealth: vi.fn() }));

vi.mock('@data/queries/database-health', () => ({
  pingDatabase: database.pingDatabase,
}));
vi.mock('../../src/config/discord-access', () => ({
  BOT_GUILDS: {
    STAGING_ENV: 'staging-guild',
    PROD_ENV: 'production-guild',
  },
}));
vi.mock(
  '../../src/modules/embedded-app/embedded-app-stats-cache.service',
  () => ({
    getCachedEmbeddedAppStats: embeddedStats.getCachedEmbeddedAppStats,
  }),
);
vi.mock('../../src/app/runtime-health', () => ({
  getRuntimeHealth: runtime.getRuntimeHealth,
}));

import { createHealthServer } from '../../src/app/create-health-server';

describe('health and embedded app server', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('serves anonymous staging stats without caching them in the browser', async () => {
    const stats = { game: null, currentBoss: null, killedBosses: [] };
    embeddedStats.getCachedEmbeddedAppStats.mockResolvedValue(stats);

    const response = await createHealthServer().request(
      '/api/embedded-app/stats',
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    await expect(response.json()).resolves.toEqual(stats);
    expect(embeddedStats.getCachedEmbeddedAppStats).toHaveBeenCalledWith(
      'staging-guild',
    );
  });

  it('redirects the Activity to its directory URL for relative assets', async () => {
    const response = await createHealthServer().request('/embedded-app');

    expect(response.status).toBe(302);
    expect(response.headers.get('Location')).toBe('/embedded-app/');
  });

  it('reports ready Discord and database health', async () => {
    runtime.getRuntimeHealth.mockReturnValue({
      discord: { status: 'ready', detail: null },
    });
    database.pingDatabase.mockResolvedValue(undefined);

    const response = await createHealthServer().request('/health');

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      status: 'ok',
      database: 'ok',
      discord: { status: 'ready' },
    });
  });

  it('keeps health checks cheap while Discord is starting', async () => {
    runtime.getRuntimeHealth.mockReturnValue({
      discord: { status: 'starting', detail: null },
    });

    const rootResponse = await createHealthServer().request('/');
    const healthResponse = await createHealthServer().request('/health');

    expect(await rootResponse.text()).toBe('ok');
    expect(healthResponse.status).toBe(503);
    await expect(healthResponse.json()).resolves.toMatchObject({
      status: 'unhealthy',
      database: 'unchecked',
    });
  });
});
