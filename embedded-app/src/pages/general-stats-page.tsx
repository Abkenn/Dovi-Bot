import { BrainCircuit, Clock3, Skull } from 'lucide-react';
import type { ReactNode } from 'react';
import {
  CartesianGrid,
  LabelList,
  ReferenceLine,
  Scatter,
  ScatterChart,
  type TooltipContentProps,
  XAxis,
  YAxis,
  ZAxis,
} from 'recharts';
import { GameDifficultyTooltip } from '@/components/game-difficulty-tooltip';
import { GameSwitcher } from '@/components/game-switcher';
import { StatsPageHeader } from '@/components/stats-page-header';
import { Card, CardContent } from '@/components/ui/card';
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
} from '@/components/ui/chart';
import type {
  EmbeddedAppArchivedGame,
  EmbeddedAppGameComparison,
  EmbeddedAppGeneralStats,
} from '../../../src/modules/embedded-app/embedded-app-stats.types';

const formatDuration = (seconds: number) => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
};

const difficultyChartConfig = {
  difficulty: {
    label: 'Game difficulty',
    color: 'var(--primary)',
  },
} satisfies ChartConfig;

const findGame = (games: EmbeddedAppGameComparison[], gameId: string | null) =>
  games.find((game) => game.id === gameId) ?? null;

const isGameComparison = (
  candidate: unknown,
): candidate is EmbeddedAppGameComparison => {
  if (!candidate || typeof candidate !== 'object') {
    return false;
  }

  return (
    'id' in candidate &&
    typeof candidate.id === 'string' &&
    'bossHighlights' in candidate
  );
};

const getTrend = (games: EmbeddedAppGameComparison[]) => {
  if (games.length < 2) {
    return null;
  }

  const averageX =
    games.reduce((total, game) => total + game.averageAttemptsPerBoss, 0) /
    games.length;
  const averageY =
    games.reduce(
      (total, game) => total + (game.averageWinningAttemptSeconds ?? 0),
      0,
    ) / games.length;
  const numerator = games.reduce(
    (total, game) =>
      total +
      (game.averageAttemptsPerBoss - averageX) *
        ((game.averageWinningAttemptSeconds ?? 0) - averageY),
    0,
  );
  const denominator = games.reduce(
    (total, game) => total + (game.averageAttemptsPerBoss - averageX) ** 2,
    0,
  );
  const slope = denominator === 0 ? 0 : numerator / denominator;
  const intercept = averageY - slope * averageX;

  return { slope, intercept };
};

const GameTooltip = ({ active, payload }: TooltipContentProps) => {
  const game = payload
    .map((entry) => {
      const candidate: unknown = entry.payload;
      return isGameComparison(candidate) ? candidate : null;
    })
    .find((candidate) => candidate !== null);

  if (!active || !game) {
    return null;
  }

  return <GameDifficultyTooltip game={game} />;
};

const DifficultyChart = ({ games }: { games: EmbeddedAppGameComparison[] }) => {
  const timedGames = games.filter(
    (
      game,
    ): game is EmbeddedAppGameComparison & {
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
  const trend = getTrend(timedGames);
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
              tickFormatter={(value: number) => formatDuration(value)}
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
              content={GameTooltip}
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

const HighlightCard = ({
  icon,
  label,
  game,
  detail,
}: {
  icon: ReactNode;
  label: string;
  game: EmbeddedAppGameComparison | null;
  detail: string;
}) => (
  <Card className="gap-0 py-0">
    <CardContent className="flex items-center gap-3 p-4 sm:p-6">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-[0.65rem] font-semibold tracking-[0.1em] text-muted-foreground uppercase">
          {label}
        </p>
        <p className="truncate text-lg font-bold">
          {game?.name ?? 'Not enough data'}
        </p>
        <p className="text-xs text-muted-foreground">{game ? detail : '—'}</p>
      </div>
    </CardContent>
  </Card>
);

export const GeneralStatsPage = ({
  games,
  generalStats,
}: {
  games: EmbeddedAppArchivedGame[];
  generalStats: EmbeddedAppGeneralStats;
}) => {
  const hardestByDeaths = findGame(
    generalStats.games,
    generalStats.hardestByDeathsGameId,
  );
  const longestWinningAttempt = findGame(
    generalStats.games,
    generalStats.longestWinningAttemptGameId,
  );
  const toughestOverall = findGame(
    generalStats.games,
    generalStats.toughestOverallGameId,
  );

  return (
    <main className="mx-auto min-h-svh w-full max-w-5xl space-y-5 px-3 py-3 sm:px-8 sm:py-12">
      <StatsPageHeader
        eyebrow="Dovi Career Stats"
        title="General Stats"
        statusIcon={<BrainCircuit aria-hidden="true" />}
        statusLabel="Across all defeated bosses"
      />
      <GameSwitcher games={games} selectedGameId="stats" />
      <section
        className="grid gap-3 sm:grid-cols-3"
        aria-label="General stats highlights"
      >
        <HighlightCard
          icon={<Skull aria-hidden="true" />}
          label="Hardest by deaths"
          game={hardestByDeaths}
          detail={
            hardestByDeaths
              ? `${hardestByDeaths.averageDeathsPerBoss} average deaths per boss`
              : ''
          }
        />
        <HighlightCard
          icon={<Clock3 aria-hidden="true" />}
          label="Longest winning attempt"
          game={longestWinningAttempt}
          detail={
            longestWinningAttempt?.averageWinningAttemptSeconds
              ? `${formatDuration(longestWinningAttempt.averageWinningAttemptSeconds)} average`
              : ''
          }
        />
        <HighlightCard
          icon={<BrainCircuit aria-hidden="true" />}
          label="Toughest overall"
          game={toughestOverall}
          detail="Balanced from attempts and winning time"
        />
      </section>
      <DifficultyChart games={generalStats.games} />
    </main>
  );
};
