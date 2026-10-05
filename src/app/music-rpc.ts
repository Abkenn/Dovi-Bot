import { ORPCError, os } from '@orpc/server';
import { toMusicActivityResults } from '../modules/music/music-activity';
import {
  musicFactsResponseSchema,
  musicSearchPageInputSchema,
  musicSearchPageSchema,
} from '../modules/music/music-activity.schema';
import {
  getMusicFacts,
  searchMusicCatalog,
} from '../modules/music/music-search.service';

const procedure = os.use(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (error instanceof ORPCError) throw error;
    console.error('Music activity request failed.', error);
    throw new ORPCError('SERVICE_UNAVAILABLE', {
      message: 'Music is unavailable right now. Try again shortly.',
    });
  }
});

export const musicRouter = {
  facts: procedure
    .output(musicFactsResponseSchema)
    .handler(async () => ({ facts: await getMusicFacts() })),
  searchPage: procedure
    .input(musicSearchPageInputSchema)
    .output(musicSearchPageSchema)
    .handler(async ({ input }) => {
      const matches = await searchMusicCatalog(input.query, {
        game: input.game,
      });
      if (!matches) return { results: null, total: 0, nextCursor: null };
      const next = input.cursor + 20;
      return {
        results: toMusicActivityResults(matches.slice(input.cursor, next)),
        total: matches.length,
        nextCursor: next < matches.length ? next : null,
      };
    }),
};
