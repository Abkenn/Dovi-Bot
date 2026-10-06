import { createORPCClient } from '@orpc/client';
import { RPCLink } from '@orpc/client/fetch';
import type { RpcClient } from 'orpc-stack';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { musicEndpoint } from '../../src/modules/music/music-endpoint';

const database = vi.hoisted(() => ({ pingDatabase: vi.fn() }));
const runtime = vi.hoisted(() => ({ getRuntimeHealth: vi.fn() }));
const tanstackStart = vi.hoisted(() => ({
  fetchEmbeddedApp: vi.fn(),
}));

vi.mock('@data/queries/database-health', () => ({
  pingDatabase: database.pingDatabase,
}));
vi.mock('../../src/app/runtime-health', () => ({
  getRuntimeHealth: runtime.getRuntimeHealth,
}));
vi.mock('../../src/app/tanstack-start-server', () => ({
  fetchEmbeddedApp: tanstackStart.fetchEmbeddedApp,
}));
vi.mock('../../src/modules/music/music-search.service', () => ({
  getMusicFacts: vi.fn(),
  searchMusicCatalog: vi.fn(),
}));

import { createHealthServer } from '../../src/app/create-health-server';
import { getMusicFacts } from '../../src/modules/music/music-search.service';

describe('health and embedded app server', () => {
  it('serves Music API requests through the Discord proxy without SSR', async () => {
    vi.mocked(getMusicFacts).mockResolvedValue(null);
    const api = createHealthServer();
    const client: RpcClient<typeof musicEndpoint.procedures> = createORPCClient(
      new RPCLink({
        url: 'http://localhost/.proxy/api/music/rpc',
        fetch: async (request) => {
          const response = await api.request(request);
          expect(response.status).toBe(200);
          expect(response.headers.get('cache-control')).toBe('no-store');
          return response;
        },
      }),
    );
    expect(await client.facts()).toBeNull();
    expect(tanstackStart.fetchEmbeddedApp).not.toHaveBeenCalled();
  });
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
    expect(tanstackStart.fetchEmbeddedApp).toHaveBeenCalledOnce();
  });

  it.each([
    ['/.proxy', '/'],
    ['/.proxy/', '/'],
    ['/.proxy/live?instance_id=activity', '/live?instance_id=activity'],
  ])('normalizes Discord Activity proxy path %s', async (path, expectedPath) => {
    const response = await createHealthServer().request(path);

    expect(response.status).toBe(200);
    const request = tanstackStart.fetchEmbeddedApp.mock.calls[0]?.[0];
    expect(new URL(request.url).pathname + new URL(request.url).search).toBe(
      expectedPath,
    );
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
