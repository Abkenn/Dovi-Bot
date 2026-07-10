import { useEffect, useState } from 'react';
import { fetchLiveStats } from '../api';
import type { LiveStats } from '../api.types';

const REFRESH_INTERVAL_MS = 5_000;

export const useLiveStats = () => {
  const [stats, setStats] = useState<LiveStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    const refresh = async () => {
      try {
        setStats(await fetchLiveStats(controller.signal));
        setError(null);
      } catch (cause) {
        if (!controller.signal.aborted) {
          setError(
            cause instanceof Error
              ? cause.message
              : 'Live stats are unavailable.',
          );
        }
      }
    };

    void refresh();
    const interval = window.setInterval(refresh, REFRESH_INTERVAL_MS);

    return () => {
      controller.abort();
      window.clearInterval(interval);
    };
  }, []);

  return { stats, error, loading: !stats && !error };
};
