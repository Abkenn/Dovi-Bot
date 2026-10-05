import { Hono } from 'hono';
import type {
  MusicFactsResponse,
  MusicSearchResponse,
} from '../modules/music/music.types';
import { toMusicActivityResults } from '../modules/music/music-activity';
import { musicActivitySearchSchema } from '../modules/music/music-activity-target';
import {
  getMusicFacts,
  searchMusicCatalog,
} from '../modules/music/music-search.service';

export const createMusicApi = () => {
  const api = new Hono();
  api.use('*', async (c, next) => {
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
  api.get('/facts', async (c) =>
    c.json({ facts: await getMusicFacts() } satisfies MusicFactsResponse),
  );
  api.get('/search', async (c) => {
    const mode = c.req.query('game');
    const state = musicActivitySearchSchema.safeParse({
      query: c.req.query('query'),
      game: mode === 'yes',
    });
    if (!state.success || (mode !== 'yes' && mode !== 'no'))
      return c.json(
        {
          error:
            'Enter a query between 2 and 100 characters and choose a search mode.',
        },
        400,
      );
    const results = await searchMusicCatalog(state.data.query, {
      game: state.data.game,
    });
    return c.json({
      results: results ? toMusicActivityResults(results) : null,
    } satisfies MusicSearchResponse);
  });
  return api;
};
