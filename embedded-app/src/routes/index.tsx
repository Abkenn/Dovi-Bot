import {
  createFileRoute,
  getRouteApi,
  useRouter,
} from '@tanstack/react-router';
import { useCallback } from 'react';
import { LiveStatsPage } from '@/features/live-stats/pages/live-stats-page';
import { useLiveStatsRefresh } from '@/hooks/use-live-stats-refresh';

export const Route = createFileRoute('/')({
  component: LiveStatsRoute,
});

const rootRoute = getRouteApi('__root__');

function LiveStatsRoute() {
  const { stats } = rootRoute.useLoaderData();
  const router = useRouter();
  const refresh = useCallback(() => router.invalidate(), [router]);

  useLiveStatsRefresh(refresh);

  return <LiveStatsPage stats={stats} />;
}
