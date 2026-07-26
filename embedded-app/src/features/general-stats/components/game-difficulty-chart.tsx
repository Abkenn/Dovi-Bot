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
  formatStatsDuration,
  getGeneralStatsTrend,
} from '../lib/general-stats-chart.utils';
import { GameChartTooltip } from './game-chart-tooltip';

const difficultyChartConfig = {
  difficulty: {
    label: 'Game difficulty',
    color: 'var(--primary)',
  },
} satisfies ChartConfig;

type GameDifficultyChartProps = {
  games: GameComparison[];
};

export const GameDifficultyChart = ({ games }: GameDifficultyChartProps) => {
  const timedGames = games.filter(
    (
      game,
    ): game is GameComparison & {
      averageWinningAttemptSeconds: number;
    } => game.averageWinningAttemptSeconds !== null,
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
    ...timedGames.map((game) => game.averageAttemptsPerBoss),
  );
  const maximumY = Math.max(
    1,
    ...timedGames.map((game) => game.averageWinningAttemptSeconds),
  );
  const trend = getGeneralStatsTrend(timedGames);
  const trendStartY = trend ? Math.max(0, trend.intercept) : 0;
  const trendEndY = trend
    ? Math.min(maximumY, Math.max(0, trend.intercept + trend.slope * maximumX))
    : 0;

  return (
    <Card className="overflow-visible">
      <CardContent className="p-3 sm:p-6">
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
              domain={[0, Math.ceil(maximumX * 1.1)]}
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
              domain={[0, Math.ceil(maximumY * 1.1)]}
              tickFormatter={formatStatsDuration}
              tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
              width={62}
            />
            <ZAxis type="number" dataKey="difficultyScore" range={[140, 500]} />
            {trend ? (
              <ReferenceLine
                segment={[
                  { x: 0, y: trendStartY },
                  { x: maximumX, y: trendEndY },
                ]}
                stroke="var(--primary)"
                strokeOpacity={0.6}
                strokeWidth={2}
                strokeDasharray="7 7"
              />
            ) : null}
            <ChartTooltip
              content={GameChartTooltip}
              cursor={{ stroke: 'var(--primary)', strokeDasharray: '4 4' }}
              allowEscapeViewBox={{ x: true, y: true }}
              animationDuration={180}
            />
            <Scatter
              data={timedGames}
              fill="var(--primary)"
              stroke="var(--background)"
              strokeWidth={3}
              isAnimationActive
              animationDuration={900}
              animationEasing="ease-out"
            >
              <LabelList
                dataKey="name"
                position="top"
                offset={12}
                fill="var(--foreground)"
                fontSize={11}
                fontWeight={600}
              />
            </Scatter>
          </ScatterChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
};
