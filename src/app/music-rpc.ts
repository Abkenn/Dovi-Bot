import { ORPCError, os } from '@orpc/server';
import {
  musicFactsResponseSchema,
  musicSearchPageInputSchema,
  musicSearchPageSchema,
} from '../modules/music/music-activity.schema';
import { getMusicFacts } from '../modules/music/music-search.service';
import { getMusicSearchPage } from '../modules/music/music-search-page.service';

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
    .handler(({ input }) => getMusicSearchPage(input)),
};
