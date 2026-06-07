import type { BossTrackingEndResult } from '../../generated/prisma/enums';
import type { PrismaTransactionClient } from '../../types/prisma/types';
import type { BossTopicTermInput } from './boss-topic-info.types';

export type { UpsertBossTopicTermsInput } from './boss-topic-info.types';

export type PauseOtherActiveSessionsInput = {
  tx: PrismaTransactionClient;
  guildId: string;
  exceptSessionId?: string;
  pausedAt: Date;
  reason: string;
};

export type BossTrackingReconciliationInput = {
  startDeaths: number;
  finalDeaths: number;
  recordedDeathCount: number;
};

export type DeleteOrphanedBossAfterCancelInput = {
  tx: PrismaTransactionClient;
  bossId: string;
};

export type DeleteOrphanedGameAfterCancelInput = {
  tx: PrismaTransactionClient;
  gameId: string;
  gameName: string;
};

export type StartBossTrackingSessionInput = {
  guildId: string;
  channelId: string;
  trackerUserId: string;
  gameName: string;
  normalizedGameName: string;
  bossName: string;
  normalizedBossName: string;
  startDeaths: number;
  startedAt?: Date;
  vodLabel?: string;
  vodStartSeconds?: number;
  topicTerms: BossTopicTermInput[];
};

export type UpdateBossTrackingInfoInput = {
  guildId: string;
  normalizedGameName?: string;
  normalizedBossName?: string;
  canonicalBossName?: string;
  normalizedCanonicalBossName?: string;
  createdByUserId: string;
  runbackSeconds?: number;
  topicTerms: BossTopicTermInput[];
};

export type RecordBossTrackingDeathInput = {
  guildId: string;
  vodDeathSeconds?: number;
};

export type PauseBossTrackingSessionInput = {
  guildId: string;
  reason: string | null;
  currentDeaths?: number;
};

export type ResumeBossTrackingSessionInput = {
  guildId: string;
  normalizedGameName?: string;
  normalizedBossName?: string;
  vodLabel?: string;
  vodResumeSeconds?: number;
};

export type EndBossTrackingSessionInput = {
  guildId: string;
  result: BossTrackingEndResult;
  finalDeaths?: number;
  manualTrackedSeconds?: number;
  vodEndSeconds?: number;
};
