export type CurrentBoss = {
  name: string;
  status: 'ACTIVE' | 'PAUSED';
  deaths: number;
  attemptNumber: number | null;
  attemptStartedAt: string | null;
  pausedAt: string | null;
  pauseReason: string | null;
};

export type KilledBoss = {
  name: string;
  deaths: number;
  killedAt: string;
};

export type LiveStats = {
  game: {
    id: string;
    name: string;
    deaths: number;
    killedBossCount: number;
  } | null;
  currentBoss: CurrentBoss | null;
  killedBosses: KilledBoss[];
};
