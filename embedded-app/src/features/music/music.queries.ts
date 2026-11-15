import { musicEndpoint } from '@modules/music/music-endpoint';
import { createIsomorphicFn } from '@tanstack/react-start';
import { getRequest, getRequestHeaders } from '@tanstack/react-start/server';
import { createQueries, createRpcClient } from 'orpc-stack/client';
import { kyTransport } from 'orpc-stack/ky';

const getMusicClient = createIsomorphicFn()
  .server(() =>
    createRpcClient(musicEndpoint, {
      origin: () => new URL(getRequest().url).origin,
      headers: () => getRequestHeaders(),
      fetch: kyTransport,
    }),
  )
  .client(() => createRpcClient(musicEndpoint, { fetch: kyTransport }));

export const musicQueries = createQueries(musicEndpoint, {
  client: getMusicClient(),
});
export const musicFactsOptions = { staleTime: 60_000 };
