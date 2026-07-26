import { createFileRoute, getRouteApi } from '@tanstack/react-router';
import { GeneralStatsPage } from '@/features/general-stats/pages/general-stats-page';

export const Route = createFileRoute('/stats')({
  component: GeneralStatsRoute,
});

const rootRoute = getRouteApi('__root__');

function GeneralStatsRoute() {
  const { stats } = rootRoute.useLoaderData();

  return (
    <GeneralStatsPage games={stats.games} generalStats={stats.generalStats} />
  );
}
