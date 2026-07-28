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
      className="general-stats-pip-only activity-compact:flex hidden w-full max-w-md"
    >
      <CardContent className="w-full p-4">
        <div className="mb-3 flex items-center gap-2">
          <BrainCircuit className="size-5 text-primary" aria-hidden="true" />
          <div>
            <p className="text-[0.6rem] font-bold tracking-[0.18em] text-primary uppercase">
              PiP summary
            </p>
            <h1 className="text-lg font-bold">General Stats</h1>
          </div>
        </div>
        <dl className="grid gap-2">
          {highlights.map(({ label, game }) => (
            <div
              key={label}
              className="grid grid-cols-[6rem_1fr] items-center gap-2 rounded-lg bg-muted/45 px-3 py-2"
            >
              <dt className="text-[0.65rem] font-semibold tracking-wide text-muted-foreground uppercase">
                {label}
              </dt>
              <dd className="min-w-0 text-right">
                <span className="block truncate text-sm font-bold">
                  {game?.name ?? 'Not enough data'}
                </span>
                {game ? (
                  <span className="block truncate text-[0.65rem] text-muted-foreground">
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
