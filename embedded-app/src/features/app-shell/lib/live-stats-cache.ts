import type { LiveStats } from '@/live-stats.types';

const LIVE_STATS_CACHE_KEY = 'dovi-live-stats-snapshot-v1';

export type LiveStatsSnapshot = {
  cachedAt: string;
  stats: LiveStats;
};

export const cacheLiveStats = (
  stats: LiveStats,
  storage: Pick<Storage, 'setItem'> = localStorage,
) => {
  const snapshot: LiveStatsSnapshot = {
    cachedAt: new Date().toISOString(),
    stats,
  };

  try {
    storage.setItem(LIVE_STATS_CACHE_KEY, JSON.stringify(snapshot));
  } catch {
    return;
  }
};

export const readCachedLiveStats = (
  storage: Pick<Storage, 'getItem'> = localStorage,
): LiveStatsSnapshot | null => {
  try {
    const cached = storage.getItem(LIVE_STATS_CACHE_KEY);

    if (!cached) {
      return null;
    }

    return JSON.parse(cached) as LiveStatsSnapshot;
  } catch {
    return null;
  }
};
