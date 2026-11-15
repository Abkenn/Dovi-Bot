import { dehydrate, hydrate, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { expect, it, vi } from 'vitest';
import { createQueryClient } from './lib/query-client';

const load = vi.hoisted(() => vi.fn());
vi.mock('./live-stats.functions', () => ({ getLiveStats: load }));

import { liveStatsQueryOptions, useLiveStatsQuery } from './live-stats.query';

it('hydrates loader data into Suspense and refreshes all consumers without discarding data on failure', async () => {
  const initial = {
    stats: { games: [] },
    deploymentVersion: 'first',
    discordClientId: '123',
  };
  load.mockResolvedValueOnce(initial);
  const server = createQueryClient();
  await server.query({ ...liveStatsQueryOptions, staleTime: 'static' });
  const browser = createQueryClient();
  hydrate(browser, dehydrate(server));
  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={browser}>{children}</QueryClientProvider>
  );
  const view = renderHook(() => useLiveStatsQuery(), { wrapper });
  expect(view.result.current.data).toEqual(initial);
  expect(load).toHaveBeenCalledTimes(1);
  const updated = { ...initial, deploymentVersion: 'second' };
  load.mockResolvedValueOnce(updated);
  await act(() =>
    browser.invalidateQueries({ queryKey: liveStatsQueryOptions.queryKey }),
  );
  await waitFor(() => expect(view.result.current.data).toEqual(updated));
  load.mockRejectedValueOnce(new Error('Unavailable'));
  await act(() =>
    browser.invalidateQueries({ queryKey: liveStatsQueryOptions.queryKey }),
  );
  expect(view.result.current.data).toEqual(updated);
  expect(
    createQueryClient().getQueryData(liveStatsQueryOptions.queryKey),
  ).toBeUndefined();
  view.unmount();
  server.clear();
  browser.clear();
});
