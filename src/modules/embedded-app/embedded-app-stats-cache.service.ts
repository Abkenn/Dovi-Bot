import { getEmbeddedAppStats } from './embedded-app-stats.service';
import type { EmbeddedAppStats } from './embedded-app-stats.types';

const EMBEDDED_APP_STATS_CACHE_MS = 12 * 60 * 60 * 1_000;

type LoadEmbeddedAppStats = (guildId: string) => Promise<EmbeddedAppStats>;

export const createEmbeddedAppStatsCache = (
  loadStats: LoadEmbeddedAppStats = getEmbeddedAppStats,
) => {
  let cached:
    | { guildId: string; stats: EmbeddedAppStats; loadedAt: number }
    | undefined;
  let pending: Promise<EmbeddedAppStats> | undefined;
  let generation = 0;

  const get = async (guildId: string) => {
    const now = Date.now();
    if (
      cached?.guildId === guildId &&
      now - cached.loadedAt < EMBEDDED_APP_STATS_CACHE_MS
    ) {
      return cached.stats;
    }

    if (!pending) {
      const loadGeneration = generation;
      pending = loadStats(guildId)
        .then((stats) => {
          if (loadGeneration === generation) {
            cached = { guildId, stats, loadedAt: Date.now() };
          }
          return stats;
        })
        .finally(() => {
          pending = undefined;
        });
    }

    return pending;
  };

  const invalidate = (guildId: string) => {
    generation += 1;
    if (cached?.guildId === guildId) {
      cached = undefined;
    }
  };

  return { get, invalidate };
};

const embeddedAppStatsCache = createEmbeddedAppStatsCache();

export const getCachedEmbeddedAppStats = embeddedAppStatsCache.get;
export const invalidateEmbeddedAppStatsCache = embeddedAppStatsCache.invalidate;
