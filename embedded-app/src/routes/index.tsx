import { createFileRoute, useRouter } from '@tanstack/react-router';
import { useCallback } from 'react';
import {
  ActivityErrorState,
  ActivityLoadingState,
} from '@/components/activity-state';
import { useDiscordSdk } from '@/hooks/use-discord-sdk';
import { useLiveStatsRefresh } from '@/hooks/use-live-stats-refresh';
import { getLiveStats } from '@/live-stats.functions';
import { LiveStatsPage } from '@/pages/live-stats-page';

export const Route = createFileRoute('/')({
  loader: () => getLiveStats(),
  pendingComponent: ActivityLoadingState,
  errorComponent: ({ error }) => (
    <ActivityErrorState
      message={error.message || 'Live stats are unavailable.'}
    />
  ),
  component: LiveStatsRoute,
});

function LiveStatsRoute() {
  const { stats, discordClientId } = Route.useLoaderData();
  const router = useRouter();
  const refresh = useCallback(() => router.invalidate(), [router]);

  useDiscordSdk(discordClientId);
  useLiveStatsRefresh(refresh);

  return <LiveStatsPage stats={stats} />;
}
