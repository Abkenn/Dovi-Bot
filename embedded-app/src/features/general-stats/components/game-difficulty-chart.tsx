import type { MouseEvent } from 'react';
import { useMemo, useState } from 'react';
import {
  CartesianGrid,
  LabelList,
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
import {
  describeGeneralStatsTrend,
  formatStatsDuration,
  getGeneralStatsTrend,
  isGameComparison,
} from '../lib/general-stats-chart.utils';
import { GameChartTooltip } from './game-chart-tooltip';
import { GameDifficultyTooltip } from './game-difficulty-tooltip';
import { GameDotLabel } from './game-dot-label';
import { TrendExplanation } from './trend-explanation';

const difficultyChartConfig = {
  difficulty: {
    label: 'Game difficulty',
    color: 'var(--primary)',
  },
} satisfies ChartConfig;

type GameDifficultyChartProps = {
  games: GameComparison[];
};

type LockedChartPopup =
  | { kind: 'game'; game: GameComparison }
  | { kind: 'trend' }
  | null;

type TrendPopupPosition = {
  x: number;
  y: number;
};

const isPopupInteractionTarget = (target: EventTarget) =>
  target instanceof Element &&
  target.closest(
    '.recharts-scatter-symbol, .difficulty-trend, .locked-chart-popup',
  ) !== null;

const getClickedGame = (entry: unknown) => {
  if (isGameComparison(entry)) {
    return entry;
  }

  if (entry && typeof entry === 'object' && 'payload' in entry) {
    return isGameComparison(entry.payload) ? entry.payload : null;
  }

  return null;
};

export const GameDifficultyChart = ({ games }: GameDifficultyChartProps) => {
  const [isTrendHovered, setIsTrendHovered] = useState(false);
  const [lockedPopup, setLockedPopup] = useState<LockedChartPopup>(null);
  const [trendPopupPosition, setTrendPopupPosition] =
    useState<TrendPopupPosition>({ x: 12, y: 12 });
  const timedGames = useMemo(
    () =>
      games.filter(
        (
          game,
        ): game is GameComparison & {
          averageWinningAttemptSeconds: number;
        } => game.averageWinningAttemptSeconds !== null,
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

  const maximumX = Math.max(
    1,
    Math.ceil(
      Math.max(...timedGames.map((game) => game.averageAttemptsPerBoss)) * 1.1,
    ),
  );
  const maximumY = Math.max(
    60,
    Math.ceil(
      (Math.max(
        ...timedGames.map((game) => game.averageWinningAttemptSeconds),
      ) *
        1.1) /
        60,
    ) * 60,
  );
  const trend = getGeneralStatsTrend(timedGames);
  const trendStartY = trend
    ? Math.min(maximumY, Math.max(0, trend.intercept))
    : 0;
  const trendEndY = trend
    ? Math.min(maximumY, Math.max(0, trend.intercept + trend.slope * maximumX))
    : 0;
  const showTrendExplanation =
    lockedPopup?.kind === 'trend' || (lockedPopup === null && isTrendHovered);
  const closeLockedPopup = (event: MouseEvent<HTMLElement>) => {
    if (!isPopupInteractionTarget(event.target)) {
      setLockedPopup(null);
    }
  };
  const lockGamePopup = (entry: unknown) => {
    const game = getClickedGame(entry);

    if (game) {
      setLockedPopup({ kind: 'game', game });
    }
  };
  const positionTrendPopup = (event: MouseEvent<HTMLElement>) => {
    if (!isTrendHovered) {
      return;
    }

    const bounds = event.currentTarget.getBoundingClientRect();
    const x = Math.max(
      8,
      Math.min(event.clientX - bounds.left + 12, bounds.width - 296),
    );
    const y = Math.max(
      8,
      Math.min(event.clientY - bounds.top + 12, bounds.height - 88),
    );
    setTrendPopupPosition({ x, y });
  };

  return (
    <Card className="overflow-hidden">
      <CardContent
        className="relative p-3 sm:p-6"
        onClick={closeLockedPopup}
        onMouseMove={positionTrendPopup}
      >
        {trend && showTrendExplanation ? (
          <div className="locked-chart-popup">
            <TrendExplanation
              description={describeGeneralStatsTrend(trend.slope)}
              x={trendPopupPosition.x}
              y={trendPopupPosition.y}
            />
          </div>
        ) : null}
        {lockedPopup?.kind === 'game' ? (
          <div className="locked-chart-popup absolute top-3 right-3 z-30">
            <GameDifficultyTooltip game={lockedPopup.game} />
          </div>
        ) : null}
        <div className="mb-4">
          <h2 className="text-lg font-bold">Game difficulty map</h2>
          <p className="text-sm text-muted-foreground">
            Farther right means more attempts. Higher means a longer winning
            attempt. Dot size blends both. Hover or focus a game for its three
            toughest bosses.
          </p>
        </div>
        <ChartContainer
          role="img"
          aria-label="Game difficulty comparison chart"
          config={difficultyChartConfig}
          className="h-[430px] w-full"
        >
          <ScatterChart margin={{ top: 36, right: 28, bottom: 30, left: 16 }}>
            <CartesianGrid stroke="var(--border)" strokeOpacity={0.55} />
            <XAxis
              type="number"
              dataKey="averageAttemptsPerBoss"
              name="Average attempts"
              domain={[0, maximumX]}
              allowDecimals={false}
              tickFormatter={(value: number) => Math.round(value).toString()}
              tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
              label={{
                value: 'Average attempts per defeated boss',
                position: 'insideBottom',
                offset: -20,
                fill: 'var(--muted-foreground)',
                fontSize: 12,
              }}
            />
            <YAxis
              type="number"
              dataKey="averageWinningAttemptSeconds"
              name="Average winning attempt"
              domain={[0, maximumY]}
              tickFormatter={formatStatsDuration}
              tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
              width={62}
            />
            <ZAxis type="number" dataKey="difficultyScore" range={[140, 500]} />
            {trend ? (
              <>
                <ReferenceLine
                  segment={[
                    { x: 0, y: trendStartY },
                    { x: maximumX, y: trendEndY },
                  ]}
                  stroke="var(--primary)"
                  strokeOpacity={0.6}
                  strokeWidth={2}
                  strokeDasharray="7 7"
                  pointerEvents="none"
                />
                <ReferenceLine
                  segment={[
                    { x: 0, y: trendStartY },
                    { x: maximumX, y: trendEndY },
                  ]}
                  stroke="transparent"
                  strokeWidth={18}
                  onMouseEnter={() => setIsTrendHovered(true)}
                  onMouseLeave={() => setIsTrendHovered(false)}
                  onClick={() => setLockedPopup({ kind: 'trend' })}
                  className="difficulty-trend cursor-help"
                />
              </>
            ) : null}
            {lockedPopup === null ? (
              <ChartTooltip
                content={GameChartTooltip}
                cursor={{ stroke: 'var(--primary)', strokeDasharray: '4 4' }}
                allowEscapeViewBox={{ x: false, y: false }}
                isAnimationActive={false}
                wrapperStyle={{ pointerEvents: 'none', zIndex: 30 }}
              />
            ) : null}
            <Scatter
              data={timedGames}
              fill="var(--primary)"
              stroke="var(--background)"
              strokeWidth={3}
              isAnimationActive={false}
              onClick={lockGamePopup}
            >
              <LabelList dataKey="name" content={<GameDotLabel />} />
            </Scatter>
          </ScatterChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
};
