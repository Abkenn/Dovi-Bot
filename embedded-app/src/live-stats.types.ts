import type {
  EmbeddedAppArchivedGame,
  EmbeddedAppBoss,
  EmbeddedAppBossComparison,
  EmbeddedAppCurrentBoss,
  EmbeddedAppGameComparison,
  EmbeddedAppGeneralStats,
  EmbeddedAppLastKilledBoss,
  EmbeddedAppStats,
  EmbeddedAppStreamEncounter,
} from '../../src/modules/embedded-app/embedded-app-stats.types';

export type CurrentBoss = EmbeddedAppCurrentBoss;
export type LastKilledBoss = EmbeddedAppLastKilledBoss;
export type ArchivedGame = EmbeddedAppArchivedGame;
export type Boss = EmbeddedAppBoss;
export type BossComparison = EmbeddedAppBossComparison;
export type GameComparison = EmbeddedAppGameComparison;
export type GeneralStats = EmbeddedAppGeneralStats;
export type StreamEncounter = EmbeddedAppStreamEncounter;
export type LiveStats = EmbeddedAppStats;
