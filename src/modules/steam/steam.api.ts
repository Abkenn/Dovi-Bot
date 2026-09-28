import { z } from 'zod';
import { steamApi } from '../../lib/api';
import type {
  SteamDetailsParams,
  SteamGame,
  SteamReviewsParams,
  SteamSearchGame,
  SteamSearchParams,
} from './steam.types';

const steamSearchSchema = z.object({
  items: z
    .array(z.object({ id: z.number(), name: z.string(), type: z.string() }))
    .default([]),
});

const steamAppDetailsSchema = z.record(
  z.string(),
  z.object({
    success: z.boolean(),
    data: z
      .object({
        steam_appid: z.number(),
        name: z.string(),
        type: z.string(),
      })
      .optional(),
  }),
);

const steamReviewsSchema = z.object({
  success: z.number(),
  query_summary: z.object({
    total_positive: z.number(),
    total_reviews: z.number(),
  }),
});

const fetchSteamJson = async <T>(
  path: string,
  schema: z.ZodType<T>,
  searchParams: SteamSearchParams | SteamDetailsParams | SteamReviewsParams,
  signal?: AbortSignal,
): Promise<T> => {
  const response = await steamApi.get<T>(path, {
    searchParams,
    signal: signal ?? null,
  });
  if (!response.ok) {
    throw new Error(
      `Steam lookup failed: ${response.status} ${response.statusText}`,
    );
  }

  return schema.parse(await response.json());
};

export const searchSteamGames = async (
  query: string,
  signal?: AbortSignal,
): Promise<SteamSearchGame[]> => {
  const searchParams: SteamSearchParams = {
    term: query.trim(),
    l: 'english',
    cc: 'US',
  };
  const result = await fetchSteamJson(
    'api/storesearch/',
    steamSearchSchema,
    searchParams,
    signal,
  );

  return result.items
    .filter((item) => item.type === 'app')
    .map((item) => ({ id: item.id, title: item.name }));
};

export const getSteamGame = async (
  appId: number,
  signal?: AbortSignal,
): Promise<SteamGame | null> => {
  const searchParams: SteamDetailsParams = {
    appids: appId,
    l: 'english',
    cc: 'US',
  };
  const result = await fetchSteamJson(
    'api/appdetails',
    steamAppDetailsSchema,
    searchParams,
    signal,
  );
  const app = Object.values(result).find(
    (entry) => entry.success && entry.data?.steam_appid === appId,
  );

  if (!app?.data || app.data.type !== 'game') {
    return null;
  }

  return { id: app.data.steam_appid, title: app.data.name };
};

export const getSteamEnglishReviewPercent = async (
  appId: number,
  signal?: AbortSignal,
): Promise<number | null> => {
  const searchParams: SteamReviewsParams = {
    json: 1,
    filter: 'all',
    language: 'english',
    purchase_type: 'all',
    num_per_page: 0,
    playtime_filter_min: 1,
  };
  const result = await fetchSteamJson(
    `appreviews/${appId}`,
    steamReviewsSchema,
    searchParams,
    signal,
  );

  if (result.query_summary.total_reviews === 0) {
    return null;
  }

  return Math.round(
    (result.query_summary.total_positive / result.query_summary.total_reviews) *
      100,
  );
};
