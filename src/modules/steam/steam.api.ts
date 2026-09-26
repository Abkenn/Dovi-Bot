import { z } from 'zod';
import type { SteamGame, SteamSearchGame } from './steam.types';

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

const fetchSteamJson = async (
  url: URL,
  signal?: AbortSignal,
): Promise<unknown> => {
  const requestInit: RequestInit = {};
  if (signal) {
    requestInit.signal = signal;
  }
  const response = await fetch(url, requestInit);
  if (!response.ok) {
    throw new Error(
      `Steam lookup failed: ${response.status} ${response.statusText}`,
    );
  }

  return response.json();
};

export const searchSteamGames = async (
  query: string,
  signal?: AbortSignal,
): Promise<SteamSearchGame[]> => {
  const url = new URL('https://store.steampowered.com/api/storesearch/');
  url.searchParams.set('term', query.trim());
  url.searchParams.set('l', 'english');
  url.searchParams.set('cc', 'US');
  const result = steamSearchSchema.parse(await fetchSteamJson(url, signal));

  return result.items
    .filter((item) => item.type === 'app')
    .map((item) => ({ id: item.id, title: item.name }));
};

export const getSteamGame = async (
  appId: number,
  signal?: AbortSignal,
): Promise<SteamGame | null> => {
  const url = new URL('https://store.steampowered.com/api/appdetails');
  url.searchParams.set('appids', String(appId));
  url.searchParams.set('l', 'english');
  url.searchParams.set('cc', 'US');
  const result = steamAppDetailsSchema.parse(await fetchSteamJson(url, signal));
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
  const url = new URL(`https://store.steampowered.com/appreviews/${appId}`);
  url.searchParams.set('json', '1');
  url.searchParams.set('filter', 'all');
  url.searchParams.set('language', 'english');
  url.searchParams.set('purchase_type', 'all');
  url.searchParams.set('num_per_page', '0');
  url.searchParams.set('playtime_filter_min', '1');
  const result = steamReviewsSchema.parse(await fetchSteamJson(url, signal));

  if (result.query_summary.total_reviews === 0) {
    return null;
  }

  return Math.round(
    (result.query_summary.total_positive / result.query_summary.total_reviews) *
      100,
  );
};
