import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const database = vi.hoisted(() => ({ pingDatabase: vi.fn() }));
const runtime = vi.hoisted(() => ({ getRuntimeHealth: vi.fn() }));
const tanstackStart = vi.hoisted(() => ({
  fetchEmbeddedApp: vi.fn(),
  registerEmbeddedAppStatsLoader: vi.fn(),
}));

vi.mock('@data/queries/database-health', () => ({
  pingDatabase: database.pingDatabase,
}));
vi.mock('../../src/app/runtime-health', () => ({
  getRuntimeHealth: runtime.getRuntimeHealth,
}));
vi.mock('../../src/app/tanstack-start-server', () => ({
  fetchEmbeddedApp: tanstackStart.fetchEmbeddedApp,
  registerEmbeddedAppStatsLoader: tanstackStart.registerEmbeddedAppStatsLoader,
}));

import { createHealthServer } from '../../src/app/create-health-server';

describe('health and embedded app server', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tanstackStart.fetchEmbeddedApp.mockResolvedValue(
      new Response('<html>Live Stats</html>', {
        headers: { 'Content-Type': 'text/html' },
      }),
    );
  });

  afterEach(() => vi.useRealTimers());

  it('delegates the root document to TanStack Start SSR', async () => {
    const response = await createHealthServer().request('/');

    expect(response.status).toBe(200);
    expect(await response.text()).toContain('Live Stats');
    expect(tanstackStart.registerEmbeddedAppStatsLoader).toHaveBeenCalledOnce();
    expect(tanstackStart.fetchEmbeddedApp).toHaveBeenCalledOnce();
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

  it('reports a sleepy database without failing the process health check', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(Date.now() + 61_000));
    runtime.getRuntimeHealth.mockReturnValue({
      discord: { status: 'ready', detail: null },
    });
    database.pingDatabase.mockRejectedValue(new Error('Database unavailable'));

    const response = await createHealthServer().request('/health');

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      status: 'ok',
      database: 'sleepy',
    });
  });

  it('keeps health checks cheap while Discord is starting', async () => {
    runtime.getRuntimeHealth.mockReturnValue({
      discord: { status: 'starting', detail: null },
    });

    const rootResponse = await createHealthServer().request('/');
    const healthResponse = await createHealthServer().request('/health');

    expect(await rootResponse.text()).toContain('Live Stats');
    expect(healthResponse.status).toBe(503);
    await expect(healthResponse.json()).resolves.toMatchObject({
      status: 'unhealthy',
      database: 'unchecked',
    });
  });
});
