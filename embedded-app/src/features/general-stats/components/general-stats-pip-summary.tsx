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
      className="general-stats-pip-only activity-compact:flex hidden w-full max-w-md gap-0 py-0 font-sans"
    >
      <CardContent className="w-full p-2">
        <div className="mb-1 flex items-center gap-2">
          <BrainCircuit className="size-4 text-primary" aria-hidden="true" />
          <div>
            <h1 className="text-sm font-bold">General Stats</h1>
          </div>
        </div>
        <dl className="grid gap-1">
          {highlights.map(({ label, game }) => (
            <div
              key={label}
              className="grid grid-cols-[5rem_minmax(0,1fr)] items-center gap-2 rounded-lg bg-muted/45 px-2 py-1"
            >
              <dt className="text-[0.65rem] font-semibold text-muted-foreground">
                {label}
              </dt>
              <dd className="min-w-0 text-right">
                <span className="block text-xs font-bold">
                  {game?.name ?? 'Not enough data'}
                </span>
                {game ? (
                  <span className="block text-[0.65rem] text-muted-foreground">
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
                  </span>
                ) : null}
              </dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
};
