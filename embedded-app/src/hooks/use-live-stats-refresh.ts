import { useEffect } from 'react';

const REFRESH_INTERVAL_MS = 5_000;

type RefreshLiveStats = () => unknown;

export const useLiveStatsRefresh = (refresh: RefreshLiveStats) => {
  useEffect(() => {
    void refresh();

    const interval = window.setInterval(() => {
      void refresh();
    }, REFRESH_INTERVAL_MS);

    return () => window.clearInterval(interval);
  }, [refresh]);
};
