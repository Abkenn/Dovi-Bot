import type {
  BossAchievement,
  BossComparison,
  GameComparison,
} from '@/live-stats.types';

export type ChartBoss = {
  gameId: string;
  boss: BossComparison;
};

export type ChartBossWinner = {
  gameId: string;
  bossName: string;
};

export type ChartBossWinners = Record<BossAchievement, ChartBossWinner | null>;

export type HoveredChartGame = { game: GameComparison; source: 'dot' | 'key' };

export type PipGameHighlight = {
  label: string;
  achievement: BossAchievement;
  game: GameComparison | null;
};
