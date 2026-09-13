import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import type { GameComparison } from '@/live-stats.types';
import { formatStatsDuration } from '../lib/general-stats-chart.utils';
import { GameDifficultyTooltip } from './game-difficulty-tooltip';

type GameDifficultyChartProps = {
  games: GameComparison[];
};

const getBarWidth = (value: number, maximum: number) =>
  `${Math.max(4, (value / maximum) * 100)}%`;

export const GameDifficultyChart = ({ games }: GameDifficultyChartProps) => {
  const [selectedGame, setSelectedGame] = useState<GameComparison | null>(null);
  const timedGames = useMemo(
    () =>
      [...games]
        .filter(
          (
            game,
          ): game is GameComparison & {
            averageWinningAttemptSeconds: number;
          } => game.averageWinningAttemptSeconds !== null,
        )
        .sort(
          (left, right) =>
            (right.difficultyScore ?? 0) - (left.difficultyScore ?? 0) ||
            left.name.localeCompare(right.name),
        ),
    [games],
  );

  if (timedGames.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">
          Winning-attempt timing is not available yet.
        </CardContent>
      </Card>
    );
  }

  const maximumAttempts = Math.max(
    1,
    ...timedGames.map((game) => game.averageAttemptsPerBoss),
  );
  const maximumWinningTime = Math.max(
    1,
    ...timedGames.map((game) => game.averageWinningAttemptSeconds),
  );

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-3 sm:p-6">
        <div className="mb-5">
          <h2 className="text-lg font-bold">Game difficulty ranking</h2>
          <p className="text-sm text-muted-foreground">
            Games are ranked by combined difficulty. Each row compares average
            attempts and winning-attempt time on the same fixed scales.
          </p>
        </div>

        <ol aria-label="Game difficulty comparison" className="space-y-2">
          {timedGames.map((game, index) => (
            <li key={game.id}>
              <button
                type="button"
                aria-label={`View details for ${game.name}`}
                aria-expanded={selectedGame?.id === game.id}
                onClick={() => setSelectedGame(game)}
                className="grid w-full grid-cols-[2rem_minmax(0,1fr)] gap-3 rounded-xl border border-border/70 bg-background/30 p-3 text-left transition-colors hover:border-primary/45 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:grid-cols-[2rem_minmax(8rem,0.8fr)_minmax(12rem,1.4fr)_minmax(8rem,1fr)] sm:items-center"
              >
                <span className="row-span-2 text-center text-sm font-bold text-muted-foreground sm:row-span-1">
                  {index + 1}
                </span>
                <span className="truncate font-semibold">{game.name}</span>
                <span className="space-y-1">
                  <span className="flex justify-between gap-3 text-xs">
                    <span className="text-muted-foreground">Attempts</span>
                    <span className="font-semibold tabular-nums">
                      {game.averageAttemptsPerBoss.toFixed(1)} avg
                    </span>
                  </span>
                  <span className="block h-1.5 overflow-hidden rounded-full bg-muted">
                    <span
                      className="block h-full rounded-full bg-primary"
                      style={{
                        width: getBarWidth(
                          game.averageAttemptsPerBoss,
                          maximumAttempts,
                        ),
                      }}
                    />
                  </span>
                </span>
                <span className="space-y-1">
                  <span className="flex justify-between gap-3 text-xs">
                    <span className="text-muted-foreground">Winning time</span>
                    <span className="font-semibold tabular-nums">
                      {formatStatsDuration(game.averageWinningAttemptSeconds)}
                    </span>
                  </span>
                  <span className="block h-1.5 overflow-hidden rounded-full bg-muted">
                    <span
                      className="block h-full rounded-full bg-primary/65"
                      style={{
                        width: getBarWidth(
                          game.averageWinningAttemptSeconds,
                          maximumWinningTime,
                        ),
                      }}
                    />
                  </span>
                </span>
              </button>
              {selectedGame?.id === game.id ? (
                <div className="mt-2 ml-11 sm:max-w-sm">
                  <GameDifficultyTooltip game={game} />
                </div>
              ) : null}
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
};
