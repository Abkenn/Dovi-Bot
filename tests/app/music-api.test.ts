import { createORPCClient } from '@orpc/client';
import { RPCLink } from '@orpc/client/fetch';
import { ORPCError } from '@orpc/server';
import { Hono } from 'hono';
import type { RpcClient } from 'orpc-stack';
import * as honoIntegration from 'orpc-stack/hono';
import { beforeEach, expect, it, vi } from 'vitest';
import { musicEndpoint } from '../../src/modules/music/music-endpoint';

const service = vi.hoisted(() => ({
  getMusicFacts: vi.fn(),
  searchMusicCatalog: vi.fn(),
}));
vi.mock('../../src/modules/music/music-search.service', () => service);
vi.mock('orpc-stack/hono', async (importOriginal) => {
  const original = await importOriginal<typeof import('orpc-stack/hono')>();
  return { ...original, mountHono: vi.fn(original.mountHono) };
});

import { createMusicApi } from '../../src/app/music-api';

const rpcClient = (mountPath = '') => {
  const api = new Hono().route(mountPath, createMusicApi());
  const client: RpcClient<typeof musicEndpoint.procedures> = createORPCClient(
    new RPCLink({
      url: `http://localhost${mountPath}${musicEndpoint.path}`,
      fetch: async (request) => api.request(request),
    }),
  );
  return client;
};

it('serves bounded RPC pages with totals and a terminal cursor', async () => {
  service.searchMusicCatalog.mockResolvedValue(
    Array.from({ length: 21 }, (_, index) => ({
      title: `Theme ${index}`,
      game: 'Series',
      count: 1,
      lastDate: '2026-01-01',
      lastOffsetSeconds: 60,
      lastStream: 'D1',
      video: null,
    })),
  );
  const client = rpcClient();
  const first = await client.searchPage({
    query: 'Series',
    game: true,
    cursor: 0,
  });
  expect(first.results).toHaveLength(20);
  expect(first).toMatchObject({ total: 21, nextCursor: 20 });
  const last = await client.searchPage({
    query: 'Series',
    game: true,
    cursor: 20,
  });
  expect(last).toMatchObject({
    results: [{ title: 'Theme 20' }],
    total: 21,
    nextCursor: null,
  });
});

it.each([
  '',
  '/nested',
])('returns validated facts through RPC mounted at %s', async (mountPath) => {
  service.getMusicFacts.mockResolvedValue({
    track: { title: 'Theme', count: 5 },
    series: null,
  });
  expect(await rpcClient(mountPath).facts()).toEqual({
    track: { title: 'Theme', count: 5 },
    series: null,
  });
});

it('validates RPC input and hides internal service failures', async () => {
  const client = rpcClient();
  await expect(
    client.searchPage({ query: 'x', game: true, cursor: -1 }),
  ).rejects.toThrow();
  expect(service.searchMusicCatalog).not.toHaveBeenCalled();
  service.searchMusicCatalog.mockRejectedValueOnce(
    new Error('database secret'),
  );
  const log = vi.spyOn(console, 'error').mockImplementation(() => {});
  await expect(
    client.searchPage({ query: 'Series', game: true, cursor: 0 }),
  ).rejects.toThrow('Music is unavailable');
  log.mockRestore();
});

it('preserves missing catalogs and empty matches through RPC', async () => {
  service.searchMusicCatalog
    .mockResolvedValueOnce(null)
    .mockResolvedValueOnce([]);
  const client = rpcClient();
  expect(
    await client.searchPage({ query: 'Series', game: true, cursor: 0 }),
  ).toEqual({ results: null, total: 0, nextCursor: null });
  expect(
    await client.searchPage({ query: 'Series', game: true, cursor: 0 }),
  ).toEqual({ results: [], total: 0, nextCursor: null });
});

beforeEach(() => vi.resetAllMocks());

it.each([
  '/facts',
  '/search?query=Theme&game=no',
  '/rpc/unknown',
])('does not expose legacy or unknown routes: %s', async (path) => {
  expect((await createMusicApi().request(path)).status).toBe(404);
  expect(service.getMusicFacts).not.toHaveBeenCalled();
  expect(service.searchMusicCatalog).not.toHaveBeenCalled();
});

it('preserves intentional service RPC errors', async () => {
  service.getMusicFacts.mockRejectedValueOnce(
    new ORPCError('FORBIDDEN', { message: 'Access denied' }),
  );
  const log = vi.spyOn(console, 'error');
  await expect(rpcClient().facts()).rejects.toThrow('Access denied');
  expect(log).not.toHaveBeenCalled();
  log.mockRestore();
});

it('returns a safe fallback when the framework handler throws', async () => {
  const mount = vi
    .spyOn(honoIntegration, 'mountHono')
    .mockImplementationOnce((app, endpoint) => {
      app.all(`${endpoint.path}/*`, () => {
        throw new Error('framework secret');
      });
      return app;
    });
  const log = vi.spyOn(console, 'error').mockImplementation(() => {});
  try {
    const response = await createMusicApi().request(
      `${musicEndpoint.path}/facts`,
      { method: 'POST' },
    );
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      error: 'Music is unavailable right now. Try again shortly.',
    });
    expect(response.headers.get('cache-control')).toBe('no-store');
  } finally {
    mount.mockRestore();
    log.mockRestore();
  }
});

it('rejects unexpected input for Music facts before calling its service', async () => {
  const response = await createMusicApi().request(
    `${musicEndpoint.path}/facts`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ json: { unexpected: true } }),
    },
  );
  expect(response.status).toBe(400);
  expect(service.getMusicFacts).not.toHaveBeenCalled();
});
