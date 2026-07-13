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
  killedBossCount: number;
  killedBosses: EmbeddedAppKilledBoss[];
};

export type EmbeddedAppStats = {
  initialGameName?: string | null;
  game: {
    id: string;
    name: string;
    deaths: number;
    killedBossCount: number;
  } | null;
  currentBoss: EmbeddedAppCurrentBoss | null;
  currentStreamWindow: {
    startAt: string;
    endAt: string;
  } | null;
  streamEncounters: EmbeddedAppStreamEncounter[];
  killedBosses: EmbeddedAppKilledBoss[];
  games: EmbeddedAppArchivedGame[];
};
