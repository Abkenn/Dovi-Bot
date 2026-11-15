import { createFileRoute } from '@tanstack/react-router';
import { GeneralStatsPage } from '@/features/general-stats/pages/general-stats-page';
import { useLiveStatsQuery } from '@/live-stats.query';

export const Route = createFileRoute('/stats')({
  component: GeneralStatsRoute,
});

function GeneralStatsRoute() {
  const { stats } = useLiveStatsQuery().data;

  return (
    <GeneralStatsPage games={stats.games} generalStats={stats.generalStats} />
  );
}
