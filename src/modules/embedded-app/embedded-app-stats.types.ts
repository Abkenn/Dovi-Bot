export type EmbeddedAppCurrentBoss = {
  name: string;
  status: 'ACTIVE' | 'PAUSED';
  deaths: number;
  attemptNumber: number | null;
  attemptStartedAt: string | null;
  pausedAt: string | null;
  pauseReason: string | null;
};

export type EmbeddedAppKilledBoss = {
  name: string;
  deaths: number;
  killedAt: string;
};

export type EmbeddedAppStats = {
  game: {
    id: string;
    name: string;
    deaths: number;
    killedBossCount: number;
  } | null;
  currentBoss: EmbeddedAppCurrentBoss | null;
  killedBosses: EmbeddedAppKilledBoss[];
};
