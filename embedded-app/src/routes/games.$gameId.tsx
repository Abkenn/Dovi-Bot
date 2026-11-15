import { createFileRoute } from '@tanstack/react-router';
import { ActivityErrorState } from '@/components/activity-state';
import { ArchivedGamePage } from '@/features/archived-game/pages/archived-game-page';
import { useLiveStatsQuery } from '@/live-stats.query';

export const Route = createFileRoute('/games/$gameId')({
  component: ArchivedGameRoute,
});

function ArchivedGameRoute() {
  const { gameId } = Route.useParams();
  const { stats } = useLiveStatsQuery().data;
  const game = stats.games.find((candidate) => candidate.id === gameId);

  if (!game) {
    return <ActivityErrorState message="Those game stats were not found." />;
  }

  return <ArchivedGamePage game={game} games={stats.games} />;
}
