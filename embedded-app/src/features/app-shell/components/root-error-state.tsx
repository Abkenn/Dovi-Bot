import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { ActivityErrorState } from '@/components/activity-state';
import { liveStatsQueryOptions } from '@/live-stats.query';
import { readCachedLiveStats } from '../lib/live-stats-cache';
import { CachedStatsContent } from './cached-stats-content';

const OFFLINE_FALLBACK_DELAY_MS = 3_000;
const RECOVERY_RETRY_DELAY_MS = 5_000;

type RootErrorStateProps = {
  reset: () => void;
};

export const RootErrorState = ({ reset }: RootErrorStateProps) => {
  const [showOfflineSnapshot, setShowOfflineSnapshot] = useState(false);
  const snapshot = readCachedLiveStats();
  const queryClient = useQueryClient();

  useEffect(() => {
    const timeout = window.setTimeout(
      () => setShowOfflineSnapshot(true),
      OFFLINE_FALLBACK_DELAY_MS,
    );
    return () => window.clearTimeout(timeout);
  }, []);

  useEffect(() => {
    const retry = () => {
      void queryClient
        .query({ ...liveStatsQueryOptions, staleTime: 0 })
        .then(() => reset())
        .catch(() => undefined);
    };
    const interval = window.setInterval(retry, RECOVERY_RETRY_DELAY_MS);
    return () => window.clearInterval(interval);
  }, [queryClient, reset]);

  if (showOfflineSnapshot && snapshot) {
    return <CachedStatsContent snapshot={snapshot} />;
  }

  return <ActivityErrorState message="Stats are temporarily unavailable." />;
};
