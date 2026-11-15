import { musicEndpoint } from '@modules/music/music-endpoint';
import { dehydrate, hydrate, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import { createQueries, createRpcClient } from 'orpc-stack/client';
import type { PropsWithChildren } from 'react';
import { expect, it, vi } from 'vitest';
import { createQueryClient } from '@/lib/query-client';

vi.mock('@tanstack/react-start/server', () => ({
  getRequest: () => new Request('https://ssr.example/music'),
  getRequestHeaders: () => ({ 'x-request-id': 'ssr-request' }),
}));
const transport = vi.hoisted(() => vi.fn());
vi.mock('orpc-stack/ky', () => ({ kyTransport: transport }));

import { musicFactsOptions, musicQueries } from './music.queries';

it('loads facts with request context and hydrates the generated Suspense hook without another request', async () => {
  transport.mockResolvedValue(
    Response.json({
      json: { track: { title: 'Theme', count: 5 }, series: null },
    }),
  );
  const server = createQueryClient();
  await musicQueries.load(server, { facts: musicFactsOptions });
  expect(transport).toHaveBeenCalledOnce();
  const request = transport.mock.calls[0]?.[0] as Request;
  expect(request.url).toBe('https://ssr.example/api/music/rpc/facts');
  expect(request.headers.get('x-request-id')).toBe('ssr-request');
  const browserQueries = createQueries(musicEndpoint, {
    client: createRpcClient(musicEndpoint),
  });
  expect(browserQueries.facts.queryKey()).toEqual(
    musicQueries.facts.queryKey(),
  );
  const browser = createQueryClient();
  hydrate(browser, dehydrate(server));
  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={browser}>{children}</QueryClientProvider>
  );
  const view = renderHook(
    () => browserQueries.useFactsSuspenseQuery(musicFactsOptions),
    { wrapper },
  );
  expect(view.result.current.data?.track?.title).toBe('Theme');
  expect(transport).toHaveBeenCalledOnce();
  view.unmount();
  server.clear();
  browser.clear();
});

it('prefetches infinite pages using the same key and pagination as the generated hook', async () => {
  transport.mockReset();
  transport.mockImplementation(async (request: Request) => {
    const { json } = await request.json();
    return Response.json({
      json: {
        results: [],
        total: 21,
        nextCursor: json.cursor === 0 ? 20 : null,
      },
    });
  });
  const client = createQueryClient();
  const input = { query: 'Theme', game: true };
  await musicQueries.load(client, {
    searchPage: { input, pages: 2, staleTime: 30_000 },
  });
  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  const view = renderHook(
    () => musicQueries.useSearchPageInfiniteQuery(input, { staleTime: 30_000 }),
    { wrapper },
  );
  expect(view.result.current.data?.pageParams).toEqual([0, 20]);
  expect(transport).toHaveBeenCalledTimes(2);
  expect(view.result.current.hasNextPage).toBe(false);
  view.unmount();
  client.clear();
});
