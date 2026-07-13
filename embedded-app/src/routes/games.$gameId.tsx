import { createFileRoute, getRouteApi } from '@tanstack/react-router';
import { ActivityErrorState } from '@/components/activity-state';
import { ArchivedGamePage } from '@/pages/archived-game-page';

export const Route = createFileRoute('/games/$gameId')({
  component: ArchivedGameRoute,
});

const rootRoute = getRouteApi('__root__');

function ArchivedGameRoute() {
  const { gameId } = Route.useParams();
  const { stats } = rootRoute.useLoaderData();
  const game = stats.games.find((candidate) => candidate.id === gameId);

  if (!game) {
    return <ActivityErrorState message="Those game stats were not found." />;
  }

  return <ArchivedGamePage game={game} games={stats.games} />;
}
