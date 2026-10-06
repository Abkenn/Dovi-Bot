import { serve } from '@hono/node-server';

import { QueryClient } from '@tanstack/react-query';
import { createQueries } from 'orpc-stack/client';
import { kyTransport } from 'orpc-stack/ky';
import { expect, it, vi } from 'vitest';
import { createMusicApi } from '../../src/app/music-api';
import { musicEndpoint } from '../../src/modules/music/music-endpoint';

const service = vi.hoisted(() => ({
  getMusicFacts: vi.fn(),
  searchMusicCatalog: vi.fn(),
}));
vi.mock('../../src/modules/music/music-search.service', () => service);

it('runs orpc-stack queries and pagination over real HTTP through Ky and the Music API', async () => {
  service.getMusicFacts.mockResolvedValue({
    track: { title: 'Theme', count: 5 },
    series: null,
  });
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
  const app = createMusicApi();
  const server = serve({ fetch: app.fetch, hostname: '127.0.0.1', port: 0 });
  await new Promise<void>((resolve) => server.once('listening', resolve));
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const log = vi.spyOn(console, 'error').mockImplementation(() => {});
  try {
    const address = server.address();
    if (!address || typeof address === 'string')
      throw new Error('Expected local HTTP server');
    const queries = createQueries(musicEndpoint, {
      origin: `http://127.0.0.1:${address.port}`,
      fetch: kyTransport,
    });
    expect(await client.fetchQuery(queries.facts.queryOptions())).toEqual({
      track: { title: 'Theme', count: 5 },
      series: null,
    });
    const options = queries.searchPage.infiniteOptions({
      input: (cursor: number) => ({ query: 'Series', game: true, cursor }),
      initialPageParam: 0,
      getNextPageParam: (page) => page.nextCursor ?? undefined,
    });
    const results = await client.fetchInfiniteQuery({ ...options, pages: 2 });
    expect(
      results.pages.map((page) => ({
        total: page.total,
        nextCursor: page.nextCursor,
        size: page.results?.length,
      })),
    ).toEqual([
      { total: 21, nextCursor: 20, size: 20 },
      { total: 21, nextCursor: null, size: 1 },
    ]);
    service.getMusicFacts.mockRejectedValueOnce(
      new Error('internal database detail'),
    );
    await expect(queries.facts.call()).rejects.toThrow('Music is unavailable');
    expect(service.getMusicFacts).toHaveBeenCalledTimes(2);
  } finally {
    client.clear();
    log.mockRestore();
    if ('closeAllConnections' in server) server.closeAllConnections();
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
});
