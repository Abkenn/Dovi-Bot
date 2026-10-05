import { createORPCClient } from '@orpc/client';
import { RPCLink } from '@orpc/client/fetch';
import type { RouterClient } from '@orpc/server';
import ky from 'ky';
import type { musicRouter } from '../../../../src/app/music-rpc';
import type { MusicSearchPageInput } from '../../../../src/modules/music/music.types';
import {
  musicFactsResponseSchema,
  musicSearchPageSchema,
} from '../../../../src/modules/music/music-activity.schema';

const rpc: RouterClient<typeof musicRouter> = createORPCClient(
  new RPCLink({
    url: () => new URL('/api/music/rpc', window.location.origin),
    fetch: (request, init) =>
      ky(request, { ...init, throwHttpErrors: false, retry: 0 }),
  }),
);

export const loadMusicFacts = async (signal?: AbortSignal) =>
  musicFactsResponseSchema.parse(await rpc.facts(undefined, { signal })).facts;

export const searchMusicPage = async (
  input: MusicSearchPageInput,
  signal?: AbortSignal,
) => musicSearchPageSchema.parse(await rpc.searchPage(input, { signal }));
