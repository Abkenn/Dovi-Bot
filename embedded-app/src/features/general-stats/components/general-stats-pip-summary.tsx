import { BrainCircuit } from 'lucide-react';
import { BossAchievements } from '@/components/boss-achievements';
import { Card, CardContent } from '@/components/ui/card';
import type { GameComparison } from '@/live-stats.types';
import type { PipGameHighlight } from '../general-stats.types';
import { formatStatsDuration } from '../lib/general-stats-chart.utils';

type GeneralStatsPipSummaryProps = {
  hardestByDeaths: GameComparison | null;
  longestWinningAttempt: GameComparison | null;
  toughestOverall: GameComparison | null;
};

export const GeneralStatsPipSummary = ({
  hardestByDeaths,
  longestWinningAttempt,
  toughestOverall,
}: GeneralStatsPipSummaryProps) => {
  const highlights = [
    { label: 'Most deaths', achievement: 'MOST_DEATHS', game: hardestByDeaths },
    {
      label: 'Longest win',
      achievement: 'LONGEST_WINNING_ATTEMPT',
      game: longestWinningAttempt,
    },
    {
      label: 'Toughest overall',
      achievement: 'TOUGHEST_OVERALL',
      game: toughestOverall,
    },
  ] satisfies PipGameHighlight[];

  return (
    <Card
      role="region"
      aria-label="General stats PiP summary"
      className="general-stats-pip-only activity-compact:flex hidden w-full max-w-md min-h-0 gap-0 py-0 font-sans"
    >
      <CardContent className="general-stats-pip-content flex min-h-0 w-full flex-col p-2">
        <div className="mb-1 flex shrink-0 items-center gap-2">
          <BrainCircuit className="size-4 text-primary" aria-hidden="true" />
          <div>
            <h1 className="text-sm font-bold">General Stats</h1>
          </div>
        </div>
        <dl className="general-stats-pip-rows grid min-h-0 flex-1 auto-rows-fr gap-1">
          {highlights.map(({ label, achievement, game }) => (
            <div
              key={label}
              className="grid min-h-0 grid-cols-[1.25rem_minmax(0,1fr)_1.25rem] content-center items-center gap-x-2 rounded-lg bg-muted/45 px-2 py-1"
            >
              <dt className="flex justify-center [&_button]:size-4">
                <span className="sr-only">{label}</span>
                {game ? (
                  <BossAchievements
                    achievements={[achievement]}
                    scope="chart"
                  />
                ) : null}
              </dt>
              <dd className="min-w-0 text-center">
                <span
                  className="general-stats-pip-game block truncate font-sans text-xs leading-4 font-semibold"
                  title={game?.name}
                >
                  {game?.name ?? 'Not enough data'}
                </span>
              </dd>
              {game ? (
                <dd
                  title="Game averages per boss: attempts, attempt duration, winning-attempt duration"
                  className="general-stats-pip-metrics col-span-3 whitespace-nowrap text-center text-[0.65rem] text-muted-foreground"
                >
                  Avg: {game.averageAttemptsPerBoss} attempts ·{' '}
                  {game.averageAttemptSeconds == null
                    ? 'avg untracked'
                    : `${formatStatsDuration(game.averageAttemptSeconds)} avg`}{' '}
                  ·{' '}
                  {game.averageWinningAttemptSeconds === null
                    ? 'win untracked'
                    : `${formatStatsDuration(
                        game.averageWinningAttemptSeconds,
                      )} win`}
                </dd>
              ) : null}
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
};
