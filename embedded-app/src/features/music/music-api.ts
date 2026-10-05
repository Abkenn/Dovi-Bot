import ky from 'ky';
import { z } from 'zod';
import type {
  MusicActivityResult,
  MusicFacts,
  MusicFactsResponse,
  MusicSearchInput,
  MusicSearchResponse,
} from '../../../../src/modules/music/music.types';

const fact = z
  .object({ title: z.string(), count: z.number().int().positive() })
  .nullable();
const factsSchema = z.object({
  facts: z.object({ track: fact, series: fact }).nullable(),
});
const resultsSchema = z.object({
  results: z
    .array(
      z.object({
        title: z.string(),
        game: z.string().nullable(),
        count: z.number().int().positive(),
        date: z.string(),
        offsetSeconds: z.number().nonnegative(),
        url: z.string().url().nullable(),
      }),
    )
    .nullable(),
});

export const loadMusicFacts = async (
  signal: AbortSignal,
): Promise<MusicFacts | null> =>
  factsSchema.parse(
    await ky.get('/api/music/facts', { signal }).json<MusicFactsResponse>(),
  ).facts;

export const searchMusic = async (
  state: MusicSearchInput,
  signal: AbortSignal,
): Promise<MusicActivityResult[] | null> => {
  const searchParams = {
    query: state.query,
    game: state.game ? 'yes' : 'no',
  };
  return resultsSchema.parse(
    await ky
      .get('/api/music/search', { searchParams, signal })
      .json<MusicSearchResponse>(),
  ).results;
};
