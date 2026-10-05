import { createTanstackQueryUtils } from '@orpc/tanstack-query';
import type { MusicSearchPageInput } from '../../../../src/modules/music/music.types';
import { loadMusicFacts, searchMusicPage } from './music-api';

export const musicQueries = createTanstackQueryUtils({
  facts: (_input: undefined, options?: { signal?: AbortSignal }) =>
    loadMusicFacts(options?.signal),
  searchPage: (
    input: MusicSearchPageInput,
    options?: { signal?: AbortSignal },
  ) => searchMusicPage(input, options?.signal),
});
