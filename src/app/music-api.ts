import { ORPCError } from '@orpc/server';
import { Hono } from 'hono';
import { mountHono } from 'orpc-stack/hono';
import { paginate } from 'orpc-stack/server';
import { musicEndpoint } from '../modules/music/music-endpoint';
import { getMusicFacts } from '../modules/music/music-search.service';
import { getMusicSearchResults } from '../modules/music/music-search-results.service';

const mapHandlerError = (error: unknown) => {
  if (error instanceof ORPCError) return error;
  console.error('Music activity request failed.', error);
  return new ORPCError('SERVICE_UNAVAILABLE', {
    message: 'Music is unavailable right now. Try again shortly.',
  });
};

export const createMusicApi = () => {
  const api = new Hono();
  api.use(`${musicEndpoint.path}/*`, async (c, next) => {
    c.header('Cache-Control', 'no-store');
    await next();
  });
  api.onError((error, c) => {
    console.error('Music activity request failed.', error);
    return c.json(
      { error: 'Music is unavailable right now. Try again shortly.' },
      503,
    );
  });
  mountHono(
    api,
    musicEndpoint,
    {
      facts: getMusicFacts,
      searchPage: paginate(getMusicSearchResults, { pageSize: 20 }),
    },
    { mapHandlerError },
  );
  return api;
};
