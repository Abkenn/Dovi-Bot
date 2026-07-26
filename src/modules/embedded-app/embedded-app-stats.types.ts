export type EmbeddedAppCurrentBoss = {
  name: string;
  status: 'ACTIVE' | 'PAUSED';
  deaths: number;
  attemptNumber: number | null;
  attemptStartedAt: string | null;
  runbackSeconds: number | null;
  pausedAt: string | null;
  pauseReason: string | null;
};

export type EmbeddedAppBoss = {
  name: string;
  deaths: number;
  outcome: 'ACTIVE' | 'PAUSED' | 'KILLED';
};

export type EmbeddedAppLastKilledBoss = {
  name: string;
  deaths: number;
};

export type EmbeddedAppStreamEncounter = {
  name: string;
  deaths: number;
  outcome: 'ACTIVE' | 'PAUSED' | 'KILLED' | 'LEFT';
};

export type EmbeddedAppArchivedGame = {
  id: string;
  name: string;
  deaths: number;
  bossDeaths: number;
  nonBossDeaths: number | null;
  killedBossCount: number;
  bosses: EmbeddedAppBoss[];
  killedBosses?: EmbeddedAppBoss[];
};

export type EmbeddedAppStats = {
  initialGameName?: string | null;
  game: {
    id: string;
    name: string;
    deaths: number;
    bossDeaths: number;
    nonBossDeaths: number | null;
    killedBossCount: number;
  } | null;
  currentBoss: EmbeddedAppCurrentBoss | null;
  lastKilledBoss: EmbeddedAppLastKilledBoss | null;
  currentStreamWindow: {
    startAt: string;
    endAt: string;
  } | null;
  streamEncounters: EmbeddedAppStreamEncounter[];
  bosses: EmbeddedAppBoss[];
  killedBosses?: EmbeddedAppBoss[];
  games: EmbeddedAppArchivedGame[];
};
