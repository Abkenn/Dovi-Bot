import { z } from 'zod';
import { UnsupportedCurrencyError } from './currency-conversion.errors';
import type {
  CurrencyRate,
  GetCurrencyRateInput,
} from './currency-conversion.types';

const FRANKFURTER_API_BASE_URL = 'https://api.frankfurter.dev/v2';
const CURRENCY_RATE_CACHE_TTL_MS = 60 * 60 * 1_000;

const currencyRateResponseSchema = z.object({
  date: z.iso.date(),
  base: z.string().length(3),
  quote: z.string().length(3),
  rate: z.number().positive(),
});

type CurrencyRateCacheEntry = CurrencyRate & {
  expiresAt: number;
};

const currencyRateCache = new Map<string, CurrencyRateCacheEntry>();

export const getCurrencyRate = async ({
  base,
  quote,
  signal,
}: GetCurrencyRateInput): Promise<CurrencyRate> => {
  const cacheKey = `${base}:${quote}`;
  const cached = currencyRateCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return { date: cached.date, rate: cached.rate };
  }

  const requestInit: RequestInit = {};
  if (signal) {
    requestInit.signal = signal;
  }
  const response = await fetch(
    `${FRANKFURTER_API_BASE_URL}/rate/${base}/${quote}`,
    requestInit,
  );
  if (response.status === 422) {
    throw new UnsupportedCurrencyError([base, quote]);
  }
  if (!response.ok) {
    throw new Error(
      `Currency API request failed: ${response.status} ${response.statusText}`,
    );
  }

  const parsed = currencyRateResponseSchema.safeParse(await response.json());
  if (!parsed.success) {
    throw new Error('Invalid response from currency conversion service.');
  }

  const rate = { date: parsed.data.date, rate: parsed.data.rate };
  currencyRateCache.set(cacheKey, {
    ...rate,
    expiresAt: Date.now() + CURRENCY_RATE_CACHE_TTL_MS,
  });

  return rate;
};
