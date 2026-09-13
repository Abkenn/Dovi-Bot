import { useMemo, useState } from 'react';
import {
  CartesianGrid,
  LabelList,
  ReferenceLine,
  Scatter,
  ScatterChart,
  XAxis,
  YAxis,
} from 'recharts';
import { Card, CardContent } from '@/components/ui/card';
import { type ChartConfig, ChartContainer } from '@/components/ui/chart';
import type { GameComparison } from '@/live-stats.types';
import { formatStatsDuration } from '../lib/general-stats-chart.utils';
import { GameDifficultyTooltip } from './game-difficulty-tooltip';

type GameDifficultyChartProps = {
  games: GameComparison[];
};

type BossExtremesPoint = GameComparison & {
  chartNumber: number;
  longestBossFightSeconds: number;
  toughestBossDeaths: number;
};

const bossExtremesChartConfig = {
  extremes: {
    label: 'Boss extremes',
    color: 'var(--primary)',
  },
} satisfies ChartConfig;

const getMedian = (values: number[]) => {
  const sortedValues = [...values].sort((left, right) => left - right);
  const middleIndex = Math.floor(sortedValues.length / 2);
  const middleValue = sortedValues[middleIndex] ?? 0;

  if (sortedValues.length % 2 === 1) {
    return middleValue;
  }

  return ((sortedValues[middleIndex - 1] ?? 0) + middleValue) / 2;
};

const isBossExtremesPoint = (
  candidate: unknown,
): candidate is BossExtremesPoint =>
  Boolean(
    candidate && typeof candidate === 'object' && 'chartNumber' in candidate,
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
              chartNumber: 0,
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
        )
        .map((point, index) => ({ ...point, chartNumber: index + 1 })),
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
  const medianDeaths = getMedian(
    points.map((point) => point.toughestBossDeaths),
  );
  const medianFightSeconds = getMedian(
    points.map((point) => point.longestBossFightSeconds),
  );
  const selectPoint = (entry: unknown) => {
    const point = getClickedPoint(entry);

    if (point) {
      setSelectedGame(point);
    }
  };

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-3 sm:p-6">
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
          className="h-[390px] w-full"
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
            <ReferenceLine
              x={medianDeaths}
              stroke="var(--muted-foreground)"
              strokeDasharray="4 5"
              strokeOpacity={0.35}
            />
            <ReferenceLine
              y={medianFightSeconds}
              stroke="var(--muted-foreground)"
              strokeDasharray="4 5"
              strokeOpacity={0.35}
            />
            <Scatter
              data={points}
              fill="var(--primary)"
              stroke="var(--background)"
              strokeWidth={3}
              isAnimationActive={false}
              onClick={selectPoint}
              className="cursor-pointer"
            >
              <LabelList
                dataKey="chartNumber"
                position="center"
                fill="var(--primary-foreground)"
                fontSize={10}
                fontWeight={800}
              />
            </Scatter>
          </ScatterChart>
        </ChartContainer>

        <ol
          aria-label="Boss extremes chart legend"
          className="mt-3 grid gap-2 sm:grid-cols-2"
        >
          {points.map((point) => (
            <li key={point.id}>
              <button
                type="button"
                aria-label={`View details for ${point.name}`}
                aria-expanded={selectedGame?.id === point.id}
                onClick={() => setSelectedGame(point)}
                className="grid w-full grid-cols-[1.5rem_minmax(0,1fr)_auto] items-center gap-2 rounded-lg border border-border/70 px-3 py-2 text-left transition-colors hover:border-primary/45 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <span className="flex size-5 items-center justify-center rounded-full bg-primary text-[0.65rem] font-extrabold text-primary-foreground">
                  {point.chartNumber}
                </span>
                <span className="truncate text-sm font-semibold">
                  {point.name}
                </span>
                <span className="text-xs tabular-nums text-muted-foreground">
                  {point.toughestBossDeaths} deaths ·{' '}
                  {formatStatsDuration(point.longestBossFightSeconds)}
                </span>
              </button>
              {selectedGame?.id === point.id ? (
                <div className="mt-2">
                  <GameDifficultyTooltip game={point} />
                </div>
              ) : null}
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
};
