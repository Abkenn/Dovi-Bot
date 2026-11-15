import { useQueryClient } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { useCallback } from 'react';
import { LiveStatsPage } from '@/features/live-stats/pages/live-stats-page';
import { useLiveStatsRefresh } from '@/hooks/use-live-stats-refresh';
import { liveStatsQueryOptions, useLiveStatsQuery } from '@/live-stats.query';

export const Route = createFileRoute('/')({ component: LiveStatsRoute });

function LiveStatsRoute() {
  const { stats } = useLiveStatsQuery().data;
  const queryClient = useQueryClient();
  const refresh = useCallback(
    () => queryClient.query(liveStatsQueryOptions).catch(() => undefined),
    [queryClient],
  );
  useLiveStatsRefresh(refresh);
  return <LiveStatsPage stats={stats} />;
}
