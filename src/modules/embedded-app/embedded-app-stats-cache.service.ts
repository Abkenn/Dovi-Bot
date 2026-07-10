import { getEmbeddedAppStats } from './embedded-app-stats.service';
import type { EmbeddedAppStats } from './embedded-app-stats.types';

const EMBEDDED_APP_STATS_CACHE_MS = 4_000;

type LoadEmbeddedAppStats = (guildId: string) => Promise<EmbeddedAppStats>;

export const createEmbeddedAppStatsCache = (
  loadStats: LoadEmbeddedAppStats = getEmbeddedAppStats,
) => {
  let cached:
    | { guildId: string; stats: EmbeddedAppStats; loadedAt: number }
    | undefined;
  let pending: Promise<EmbeddedAppStats> | undefined;

  return async (guildId: string) => {
    const now = Date.now();
    if (
      cached?.guildId === guildId &&
      now - cached.loadedAt < EMBEDDED_APP_STATS_CACHE_MS
    ) {
      return cached.stats;
    }

    if (!pending) {
      pending = loadStats(guildId)
        .then((stats) => {
          cached = { guildId, stats, loadedAt: Date.now() };
          return stats;
        })
        .finally(() => {
          pending = undefined;
        });
    }

    return pending;
  };
};

export const getCachedEmbeddedAppStats = createEmbeddedAppStatsCache();
