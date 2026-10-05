import { createORPCClient } from '@orpc/client';
import { RPCLink } from '@orpc/client/fetch';
import type { RouterClient } from '@orpc/server';
import { Hono } from 'hono';
import { beforeEach, expect, it, vi } from 'vitest';
import type { musicRouter } from '../../src/app/music-rpc';

const service = vi.hoisted(() => ({
  getMusicFacts: vi.fn(),
  searchMusicCatalog: vi.fn(),
}));
vi.mock('../../src/modules/music/music-search.service', () => service);

import { createMusicApi } from '../../src/app/music-api';

const rpcClient = (mountPath = '/api/music') => {
  const api = new Hono().route(mountPath, createMusicApi());
  const client: RouterClient<typeof musicRouter> = createORPCClient(
    new RPCLink({
      url: `http://localhost${mountPath}/rpc`,
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
  '/api/music',
])('returns validated facts through RPC mounted at %s', async (mountPath) => {
  service.getMusicFacts.mockResolvedValue({
    track: { title: 'Theme', count: 5 },
    series: null,
  });
  expect(await rpcClient(mountPath).facts()).toEqual({
    facts: { track: { title: 'Theme', count: 5 }, series: null },
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
it('returns only facts and matching results using the command search service', async () => {
  service.getMusicFacts.mockResolvedValue({
    track: { title: 'Theme', count: 5 },
    series: null,
  });
  const api = createMusicApi();
  const facts = await api.request('/facts');
  expect(facts.headers.get('cache-control')).toBe('no-store');
  expect(await facts.json()).toEqual({
    facts: { track: { title: 'Theme', count: 5 }, series: null },
  });
  service.searchMusicCatalog.mockResolvedValue([
    {
      title: 'Theme',
      game: null,
      count: 5,
      lastDate: '2026-01-01',
      lastOffsetSeconds: 60,
      lastStream: 'D1',
      video: null,
    },
  ]);
  const result = await api.request('/search?query=Theme&game=no');
  expect(service.searchMusicCatalog).toHaveBeenCalledWith('Theme', {
    game: false,
  });
  expect(await result.json()).toEqual({
    results: [
      {
        title: 'Theme',
        game: null,
        count: 5,
        date: '2026-01-01',
        offsetSeconds: 60,
        url: null,
      },
    ],
  });
});
it.each([
  '/search',
  '/search?query=x&game=no',
  '/search?query=hello&game=maybe',
  `/search?query=${'a'.repeat(101)}&game=yes`,
])('rejects invalid input before reading the catalog: %s', async (path) => {
  expect((await createMusicApi().request(path)).status).toBe(400);
  expect(service.searchMusicCatalog).not.toHaveBeenCalled();
});
it('handles missing catalogs, no matches, and service failures without exposing details', async () => {
  const api = createMusicApi();
  service.searchMusicCatalog
    .mockResolvedValueOnce(null)
    .mockResolvedValueOnce([])
    .mockRejectedValueOnce(new Error('database secret'));
  expect(
    await (await api.request('/search?query=hello&game=yes')).json(),
  ).toEqual({ results: null });
  expect(
    await (await api.request('/search?query=hello&game=yes')).json(),
  ).toEqual({ results: [] });
  const log = vi.spyOn(console, 'error').mockImplementation(() => {});
  const failed = await api.request('/search?query=hello&game=yes');
  expect(failed.status).toBe(503);
  expect(await failed.text()).not.toContain('database secret');
  log.mockRestore();
});
