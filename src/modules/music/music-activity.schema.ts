import { z } from 'zod';
import { musicActivitySearchSchema } from './music-activity-target';

const factSchema = z
  .object({ title: z.string(), count: z.number().int().positive() })
  .nullable();

export const musicFactsResponseSchema = z.object({
  facts: z.object({ track: factSchema, series: factSchema }).nullable(),
});

export const musicActivityResultSchema = z.object({
  title: z.string(),
  game: z.string().nullable(),
  count: z.number().int().positive(),
  date: z.string(),
  offsetSeconds: z.number().nonnegative(),
  url: z.string().url().nullable(),
});

export const musicSearchPageInputSchema = musicActivitySearchSchema.extend({
  cursor: z.number().int().min(0).max(1_000_000),
});

export const musicSearchPageSchema = z.object({
  results: z.array(musicActivityResultSchema).max(20).nullable(),
  total: z.number().int().nonnegative(),
  nextCursor: z.number().int().positive().nullable(),
});
