import { BrainCircuit } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import type { GameComparison } from '@/live-stats.types';
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
    { label: 'Deaths', game: hardestByDeaths },
    { label: 'Winning time', game: longestWinningAttempt },
    { label: 'Overall', game: toughestOverall },
  ];

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
          {highlights.map(({ label, game }) => (
            <div
              key={label}
              className="grid min-h-0 grid-cols-[auto_minmax(0,1fr)] content-center items-center gap-x-2 rounded-lg bg-muted/45 px-2 py-1"
            >
              <dt className="text-[0.65rem] font-semibold text-muted-foreground">
                {label}
              </dt>
              <dd className="min-w-0 text-right">
                <span
                  className="block truncate text-xs font-bold"
                  title={game?.name}
                >
                  {game?.name ?? 'Not enough data'}
                </span>
              </dd>
              {game ? (
                <dd className="general-stats-pip-metrics col-span-2 whitespace-nowrap text-[0.65rem] text-muted-foreground">
                  {game.averageAttemptsPerBoss} attempts ·{' '}
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
