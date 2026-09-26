import { env } from '@zod-schemas/env.zod';
import { z } from 'zod';

const OPENCRITIC_HOST = 'opencritic-api.p.rapidapi.com';
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

const fetchOpenCriticJson = async (
  url: URL,
  apiKey: string,
  signal?: AbortSignal,
): Promise<unknown> => {
  const requestInit: RequestInit = {
    headers: {
      'x-rapidapi-host': OPENCRITIC_HOST,
      'x-rapidapi-key': apiKey,
    },
  };
  if (signal) {
    requestInit.signal = signal;
  }
  const response = await fetch(url, requestInit);
  if (!response.ok) {
    throw new Error(
      `OpenCritic lookup failed: ${response.status} ${response.statusText}`,
    );
  }

  return response.json();
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

  const searchUrl = new URL(`https://${OPENCRITIC_HOST}/game/search`);
  searchUrl.searchParams.set('criteria', title);
  const searchResults = openCriticSearchSchema.parse(
    await fetchOpenCriticJson(searchUrl, apiKey, signal),
  );
  const match =
    searchResults.find(
      (game) => normalizeTitle(game.name) === normalizedTitle,
    ) ?? searchResults[0];

  let score: number | null = null;
  if (match) {
    const gameUrl = new URL(`https://${OPENCRITIC_HOST}/game/${match.id}`);
    const game = openCriticGameSchema.parse(
      await fetchOpenCriticJson(gameUrl, apiKey, signal),
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
