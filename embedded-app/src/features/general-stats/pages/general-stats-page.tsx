import { BrainCircuit, Clock3, Skull } from 'lucide-react';
import { GameSwitcher } from '@/features/game-stats/components/game-switcher';
import { StatsPageHeader } from '@/features/game-stats/components/stats-page-header';
import type { ArchivedGame, GeneralStats } from '@/live-stats.types';
import { GameDifficultyChart } from '../components/game-difficulty-chart';
import { GeneralStatsHighlightCard } from '../components/general-stats-highlight-card';
import { GeneralStatsPipSummary } from '../components/general-stats-pip-summary';
import { getChartBossWinners } from '../lib/chart-boss-achievements';
import {
  findGeneralStatsGame,
  formatStatsDuration,
} from '../lib/general-stats-chart.utils';

type GeneralStatsPageProps = {
  games: ArchivedGame[];
  generalStats: GeneralStats;
};

export const GeneralStatsPage = ({
  games,
  generalStats,
}: GeneralStatsPageProps) => {
  const hardestByDeaths = findGeneralStatsGame(
    generalStats.games,
    generalStats.hardestByDeathsGameId,
  );
  const longestWinningAttempt = findGeneralStatsGame(
    generalStats.games,
    generalStats.longestWinningAttemptGameId,
  );
  const toughestOverall = findGeneralStatsGame(
    generalStats.games,
    generalStats.toughestOverallGameId,
  );

  const chartGames = generalStats.games.filter(
    (game) =>
      game.bossHighlights.longestWinningAttempt?.winningAttemptSeconds != null,
  );
  const chartWinners = getChartBossWinners(chartGames);
  const medalGame = (achievement: keyof typeof chartWinners) =>
    findGeneralStatsGame(chartGames, chartWinners[achievement]?.gameId ?? null);

  return (
    <main className="general-stats-frame mx-auto min-h-svh w-full max-w-5xl space-y-5 px-3 py-3 sm:px-8 sm:py-12">
      <GeneralStatsPipSummary
        hardestByDeaths={medalGame('MOST_DEATHS')}
        longestWinningAttempt={medalGame('LONGEST_WINNING_ATTEMPT')}
        toughestOverall={medalGame('TOUGHEST_OVERALL')}
      />
      <div className="general-stats-full space-y-6 activity-compact:hidden">
        <StatsPageHeader
          eyebrow="Dovi Career Stats"
          title="General Stats"
          statusIcon={<BrainCircuit aria-hidden="true" />}
          statusLabel="Across all defeated bosses"
        />
        <GameSwitcher games={games} selectedGameId="stats" />
        <section
          className="grid gap-3 sm:grid-cols-3"
          aria-label="General stats highlights"
        >
          <GeneralStatsHighlightCard
            icon={<Skull aria-hidden="true" />}
            label="Hardest by deaths"
            game={hardestByDeaths}
            detail={
              hardestByDeaths
                ? `${hardestByDeaths.averageDeathsPerBoss} average deaths per boss`
                : ''
            }
          />
          <GeneralStatsHighlightCard
            icon={<Clock3 aria-hidden="true" />}
            label="Longest winning attempt"
            game={longestWinningAttempt}
            detail={
              longestWinningAttempt?.averageWinningAttemptSeconds
                ? `${formatStatsDuration(
                    longestWinningAttempt.averageWinningAttemptSeconds,
                  )} average`
                : ''
            }
          />
          <GeneralStatsHighlightCard
            icon={<BrainCircuit aria-hidden="true" />}
            label="Toughest overall"
            game={toughestOverall}
            detail="Balanced from attempts and winning time"
          />
        </section>
        <GameDifficultyChart games={generalStats.games} />
      </div>
    </main>
  );
};
