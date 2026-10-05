import type { MouseEvent } from 'react';
import { useMemo, useRef, useState } from 'react';
import {
  CartesianGrid,
  Cell,
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
import { cn } from '@/lib/utils';
import type { GameComparison } from '@/live-stats.types';
import { compressBossStat, expandBossStat } from '../lib/boss-stats-scale';
import { formatStatsDuration } from '../lib/general-stats-chart.utils';
import { GameChartTooltip } from './game-chart-tooltip';
import { GameDifficultyTooltip } from './game-difficulty-tooltip';

type GameDifficultyChartProps = {
  games: GameComparison[];
};

type BossExtremesPoint = GameComparison & {
  longestBossFightSeconds: number;
  scaledDeaths: number;
  scaledFightSeconds: number;
  toughestBossDeaths: number;
};

type HoveredAverage = 'deaths' | 'time' | null;

type AverageTooltipPosition = {
  x: number;
  y: number;
};

const bossExtremesChartConfig = {
  extremes: {
    label: 'Boss stats',
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
  const cardRef = useRef<HTMLDivElement>(null);
  const [selectedGame, setSelectedGame] = useState<GameComparison | null>(null);
  const [lockedPosition, setLockedPosition] =
    useState<AverageTooltipPosition | null>(null);
  const [hoveredAverage, setHoveredAverage] = useState<HoveredAverage>(null);
  const [averageTooltipPosition, setAverageTooltipPosition] =
    useState<AverageTooltipPosition>({ x: 12, y: 12 });
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
              scaledDeaths: compressBossStat(
                Math.max(0, toughestBoss.attempts - 1),
                100,
              ),
              scaledFightSeconds: compressBossStat(
                longestBossFight.winningAttemptSeconds,
                960,
              ),
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
    Math.ceil(Math.max(...points.map((point) => point.scaledDeaths)) * 1.1),
  );
  const maximumFightSeconds = Math.max(
    60,
    Math.ceil(
      Math.max(...points.map((point) => point.scaledFightSeconds)) * 1.1,
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
      const card = cardRef.current;
      const popup = card?.querySelector('.recharts-tooltip-wrapper');
      if (popup && card) {
        const popupBounds = popup.getBoundingClientRect();
        const cardBounds = card.getBoundingClientRect();
        setLockedPosition({
          x: popupBounds.left - cardBounds.left,
          y: popupBounds.top - cardBounds.top,
        });
      } else {
        setLockedPosition(null);
      }
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
  const positionAverageTooltip = (event: MouseEvent<HTMLElement>) => {
    if (!hoveredAverage) {
      return;
    }

    const bounds = event.currentTarget.getBoundingClientRect();
    const x = Math.max(
      8,
      Math.min(event.clientX - bounds.left + 12, bounds.width - 230),
    );
    const y = Math.max(
      8,
      Math.min(event.clientY - bounds.top + 12, bounds.height - 44),
    );
    setAverageTooltipPosition({ x, y });
  };

  return (
    <Card className="overflow-hidden">
      <CardContent
        ref={cardRef}
        className="relative p-3 sm:p-6"
        onClick={closeLockedTooltip}
        onMouseMove={positionAverageTooltip}
      >
        {selectedGame ? (
          <div
            className={cn(
              'locked-chart-popup absolute z-30',
              !lockedPosition && 'top-24 right-6',
            )}
            style={
              lockedPosition
                ? { left: lockedPosition.x, top: lockedPosition.y }
                : undefined
            }
          >
            <GameDifficultyTooltip game={selectedGame} />
          </div>
        ) : null}
        {selectedGame === null && hoveredAverage ? (
          <div
            className="pointer-events-none absolute z-20 rounded-lg border border-border bg-card/95 px-3 py-2 text-xs font-semibold shadow-lg backdrop-blur"
            style={{
              left: averageTooltipPosition.x,
              top: averageTooltipPosition.y,
            }}
          >
            {hoveredAverage === 'deaths'
              ? `Average deaths: ${averageDeaths.toFixed(1)}`
              : `Average longest win: ${formatStatsDuration(averageFightSeconds)}`}
          </div>
        ) : null}
        <div className="mb-4">
          <h2 className="text-lg font-bold">Boss stats</h2>
          <p className="text-sm text-muted-foreground">
            Right means more deaths on the game&apos;s deadliest boss. Higher
            means a longer winning attempt. Games in the top-right had both.
          </p>
        </div>

        <div className="mb-1 px-14 text-[0.65rem] font-semibold tracking-wide text-muted-foreground uppercase">
          <span>Fight duration</span>
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
              dataKey="scaledDeaths"
              tickFormatter={(value: number) =>
                String(Math.round(expandBossStat(value, 100)))
              }
              domain={[0, maximumDeaths]}
              allowDecimals={false}
              tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
              label={{
                value: 'Deaths',
                position: 'insideBottom',
                offset: -18,
                fill: 'var(--muted-foreground)',
                fontSize: 12,
              }}
            />
            <YAxis
              type="number"
              dataKey="scaledFightSeconds"
              domain={[0, maximumFightSeconds]}
              tickFormatter={(value: number) =>
                formatStatsDuration(Math.round(expandBossStat(value, 960)))
              }
              tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
              width={62}
            />
            <ZAxis range={[343, 343]} />
            <ReferenceLine
              x={compressBossStat(averageDeaths, 100)}
              stroke="var(--muted-foreground)"
              strokeDasharray="4 5"
              strokeOpacity={0.35}
            />
            <ReferenceLine
              x={compressBossStat(averageDeaths, 100)}
              stroke="transparent"
              strokeWidth={18}
              onMouseEnter={() => setHoveredAverage('deaths')}
              onMouseLeave={() => setHoveredAverage(null)}
              className="cursor-help"
            />
            <ReferenceLine
              y={compressBossStat(averageFightSeconds, 960)}
              stroke="var(--muted-foreground)"
              strokeDasharray="4 5"
              strokeOpacity={0.35}
            />
            <ReferenceLine
              y={compressBossStat(averageFightSeconds, 960)}
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
            >
              {points.map((point) => (
                <Cell
                  key={point.id}
                  stroke={
                    selectedGame?.id === point.id
                      ? 'var(--primary)'
                      : 'var(--background)'
                  }
                  style={
                    selectedGame?.id === point.id
                      ? { filter: 'drop-shadow(0 0 6px var(--primary))' }
                      : undefined
                  }
                />
              ))}
            </Scatter>
          </ScatterChart>
        </ChartContainer>

        <ol
          aria-label="Boss stats game data"
          className="mt-3 grid gap-2 sm:grid-cols-2"
        >
          {points.map((point) => (
            <li key={point.id}>
              <button
                type="button"
                aria-label={`Lock details for ${point.name}`}
                aria-pressed={selectedGame?.id === point.id}
                onClick={() => {
                  setLockedPosition(null);
                  setSelectedGame(point);
                }}
                className={cn(
                  'chart-game-key grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-lg border border-border/70 px-3 py-2 text-left transition-colors hover:border-primary/45 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                  selectedGame?.id === point.id &&
                    'border-primary shadow-[0_0_12px_var(--primary)] bg-primary/10',
                )}
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
