import { env } from '@zod-schemas/env.zod';
import { z } from 'zod';
import { openCriticApi } from '../../lib/api';

const OPENCRITIC_CACHE_MS = 60 * 60 * 1_000;

const openCriticSearchSchema = z.array(
  z.object({ id: z.number(), name: z.string() }),
);
const openCriticGameSchema = z.object({
  topCriticScore: z.number().nullable(),
});

type CachedScore = {
  expiresAt: number;
  score: number | null;
};

const scoreCache = new Map<string, CachedScore>();

const normalizeTitle = (title: string): string =>
  title.trim().toLowerCase().split(' ').filter(Boolean).join(' ');

const fetchOpenCriticJson = async <T>(
  path: string,
  schema: z.ZodType<T>,
  apiKey: string,
  signal?: AbortSignal,
  searchParams: { criteria?: string } = {},
): Promise<T> => {
  const response = await openCriticApi.get<T>(path, {
    searchParams,
    signal: signal ?? null,
    headers: {
      'x-rapidapi-key': apiKey,
    },
  });
  if (!response.ok) {
    throw new Error(
      `OpenCritic lookup failed: ${response.status} ${response.statusText}`,
    );
  }

  return schema.parse(await response.json());
};

export const getOpenCriticScore = async (
  title: string,
  signal?: AbortSignal,
): Promise<number | null> => {
  const apiKey = env.OPENCRITIC_RAPIDAPI_KEY;
  if (!apiKey) {
    return null;
  }

  const normalizedTitle = normalizeTitle(title);
  const cached = scoreCache.get(normalizedTitle);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.score;
  }

  const searchResults = await fetchOpenCriticJson(
    'game/search',
    openCriticSearchSchema,
    apiKey,
    signal,
    { criteria: title },
  );
  const match =
    searchResults.find(
      (game) => normalizeTitle(game.name) === normalizedTitle,
    ) ?? searchResults[0];

  let score: number | null = null;
  if (match) {
    const game = await fetchOpenCriticJson(
      `game/${match.id}`,
      openCriticGameSchema,
      apiKey,
      signal,
    );
    const providerScore = game.topCriticScore;
    score = providerScore !== null && providerScore >= 0 ? providerScore : null;
  }

  scoreCache.set(normalizedTitle, {
    expiresAt: Date.now() + OPENCRITIC_CACHE_MS,
    score,
  });
  return score;
};
