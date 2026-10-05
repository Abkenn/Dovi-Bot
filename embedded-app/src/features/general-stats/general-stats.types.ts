import type { BossAchievement, BossComparison } from '@/live-stats.types';

export type ChartBoss = {
  gameId: string;
  boss: BossComparison;
};

export type ChartBossWinner = {
  gameId: string;
  bossName: string;
};

export type ChartBossWinners = Record<BossAchievement, ChartBossWinner | null>;
