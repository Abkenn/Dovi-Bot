import type { MouseEvent } from 'react';
import { useMemo, useState } from 'react';
import {
  CartesianGrid,
  ReferenceLine,
  Scatter,
  ScatterChart,
  XAxis,
  YAxis,
  ZAxis,
} from 'recharts';
import { Card, CardContent } from '@/components/ui/card';
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
} from '@/components/ui/chart';
import type { GameComparison } from '@/live-stats.types';
import { formatStatsDuration } from '../lib/general-stats-chart.utils';
import { GameChartTooltip } from './game-chart-tooltip';
import { GameDifficultyTooltip } from './game-difficulty-tooltip';

type GameDifficultyChartProps = {
  games: GameComparison[];
};

type BossExtremesPoint = GameComparison & {
  longestBossFightSeconds: number;
  toughestBossDeaths: number;
};

type HoveredAverage = 'deaths' | 'time' | null;

const bossExtremesChartConfig = {
  extremes: {
    label: 'Boss extremes',
    color: 'var(--primary)',
  },
} satisfies ChartConfig;

const getAverage = (values: number[]) =>
  values.reduce((total, value) => total + value, 0) / values.length;

const isBossExtremesPoint = (
  candidate: unknown,
): candidate is BossExtremesPoint =>
  Boolean(
    candidate &&
      typeof candidate === 'object' &&
      'toughestBossDeaths' in candidate,
  );

const getClickedPoint = (entry: unknown) => {
  if (isBossExtremesPoint(entry)) {
    return entry;
  }

  if (entry && typeof entry === 'object' && 'payload' in entry) {
    return isBossExtremesPoint(entry.payload) ? entry.payload : null;
  }

  return null;
};

export const GameDifficultyChart = ({ games }: GameDifficultyChartProps) => {
  const [selectedGame, setSelectedGame] = useState<GameComparison | null>(null);
  const [hoveredAverage, setHoveredAverage] = useState<HoveredAverage>(null);
  const points = useMemo(
    () =>
      games
        .flatMap((game) => {
          const toughestBoss = game.bossHighlights.mostAttempts;
          const longestBossFight = game.bossHighlights.longestWinningAttempt;

          if (
            !longestBossFight ||
            longestBossFight.winningAttemptSeconds === null
          ) {
            return [];
          }

          return [
            {
              ...game,
              longestBossFightSeconds: longestBossFight.winningAttemptSeconds,
              toughestBossDeaths: Math.max(0, toughestBoss.attempts - 1),
            },
          ];
        })
        .sort(
          (left, right) =>
            right.toughestBossDeaths - left.toughestBossDeaths ||
            right.longestBossFightSeconds - left.longestBossFightSeconds ||
            left.name.localeCompare(right.name),
        ),
    [games],
  );

  if (points.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">
          Boss death and winning-attempt timing data is not available yet.
        </CardContent>
      </Card>
    );
  }

  const maximumDeaths = Math.max(
    1,
    Math.ceil(
      Math.max(...points.map((point) => point.toughestBossDeaths)) * 1.1,
    ),
  );
  const maximumFightSeconds = Math.max(
    60,
    Math.ceil(
      Math.max(...points.map((point) => point.longestBossFightSeconds)) * 1.1,
    ),
  );
  const averageDeaths = getAverage(
    points.map((point) => point.toughestBossDeaths),
  );
  const averageFightSeconds = getAverage(
    points.map((point) => point.longestBossFightSeconds),
  );
  const selectPoint = (entry: unknown) => {
    const point = getClickedPoint(entry);

    if (point) {
      setSelectedGame(point);
    }
  };
  const closeLockedTooltip = (event: MouseEvent<HTMLElement>) => {
    if (
      event.target instanceof Element &&
      event.target.closest(
        '.recharts-scatter-symbol, .locked-chart-popup, .chart-game-key',
      )
    ) {
      return;
    }

    setSelectedGame(null);
  };

  return (
    <Card className="overflow-hidden">
      <CardContent className="relative p-3 sm:p-6" onClick={closeLockedTooltip}>
        {selectedGame ? (
          <div className="locked-chart-popup absolute top-24 right-6 z-30">
            <GameDifficultyTooltip game={selectedGame} />
          </div>
        ) : null}
        {selectedGame === null && hoveredAverage ? (
          <div className="pointer-events-none absolute top-24 left-24 z-20 rounded-lg border border-border bg-card/95 px-3 py-2 text-xs font-semibold shadow-lg backdrop-blur">
            {hoveredAverage === 'deaths'
              ? `Average deaths: ${averageDeaths.toFixed(1)}`
              : `Average longest win: ${formatStatsDuration(averageFightSeconds)}`}
          </div>
        ) : null}
        <div className="mb-4">
          <h2 className="text-lg font-bold">Boss extremes</h2>
          <p className="text-sm text-muted-foreground">
            Right means more deaths on the game&apos;s deadliest boss. Higher
            means a longer winning attempt. Games in the top-right had both.
          </p>
        </div>

        <div className="mb-1 flex justify-between px-14 text-[0.65rem] font-semibold tracking-wide text-muted-foreground uppercase">
          <span>Long fights</span>
          <span className="text-primary">Long + deadly</span>
        </div>
        <ChartContainer
          role="img"
          aria-label="Boss deaths and winning-attempt time comparison chart"
          config={bossExtremesChartConfig}
          className="h-[430px] w-full"
        >
          <ScatterChart margin={{ top: 12, right: 24, bottom: 30, left: 20 }}>
            <CartesianGrid stroke="var(--border)" strokeOpacity={0.55} />
            <XAxis
              type="number"
              dataKey="toughestBossDeaths"
              domain={[0, maximumDeaths]}
              allowDecimals={false}
              tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
              label={{
                value: 'Deaths on deadliest boss',
                position: 'insideBottom',
                offset: -20,
                fill: 'var(--muted-foreground)',
                fontSize: 12,
              }}
            />
            <YAxis
              type="number"
              dataKey="longestBossFightSeconds"
              domain={[0, maximumFightSeconds]}
              tickFormatter={formatStatsDuration}
              tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
              width={62}
            />
            <ZAxis range={[343, 343]} />
            <ReferenceLine
              x={averageDeaths}
              stroke="var(--muted-foreground)"
              strokeDasharray="4 5"
              strokeOpacity={0.35}
            />
            <ReferenceLine
              x={averageDeaths}
              stroke="transparent"
              strokeWidth={18}
              onMouseEnter={() => setHoveredAverage('deaths')}
              onMouseLeave={() => setHoveredAverage(null)}
              className="cursor-help"
            />
            <ReferenceLine
              y={averageFightSeconds}
              stroke="var(--muted-foreground)"
              strokeDasharray="4 5"
              strokeOpacity={0.35}
            />
            <ReferenceLine
              y={averageFightSeconds}
              stroke="transparent"
              strokeWidth={18}
              onMouseEnter={() => setHoveredAverage('time')}
              onMouseLeave={() => setHoveredAverage(null)}
              className="cursor-help"
            />
            {selectedGame === null ? (
              <ChartTooltip
                content={GameChartTooltip}
                cursor={false}
                isAnimationActive={false}
                wrapperStyle={{ pointerEvents: 'none', zIndex: 30 }}
              />
            ) : null}
            <Scatter
              data={points}
              fill="var(--primary)"
              stroke="var(--background)"
              strokeWidth={3}
              isAnimationActive={false}
              onMouseEnter={() => setHoveredAverage(null)}
              onClick={selectPoint}
              className="cursor-pointer"
            />
          </ScatterChart>
        </ChartContainer>

        <ol
          aria-label="Boss extremes game data"
          className="mt-3 grid gap-2 sm:grid-cols-2"
        >
          {points.map((point) => (
            <li key={point.id}>
              <button
                type="button"
                aria-label={`Lock details for ${point.name}`}
                onClick={() => setSelectedGame(point)}
                className="chart-game-key grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-lg border border-border/70 px-3 py-2 text-left transition-colors hover:border-primary/45 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <span className="truncate text-sm font-semibold">
                  {point.name}
                </span>
                <span className="text-xs tabular-nums text-muted-foreground">
                  {point.toughestBossDeaths} deaths ·{' '}
                  {formatStatsDuration(point.longestBossFightSeconds)}
                </span>
              </button>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
};
