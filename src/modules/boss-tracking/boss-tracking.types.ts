import type {
  BossTrackingAttemptResult,
  BossTrackingAttemptTimingStatus,
  BossTrackingEndResult,
  BossTrackingSessionStatus,
} from '../../generated/prisma/enums';

export type BossTrackingAttemptView = {
  id: string;
  attemptNumber: number;
  startedAt: Date;
  endedAt: Date | null;
  vodStartSeconds: number | null;
  vodEndSeconds: number | null;
  result: BossTrackingAttemptResult;
};

export type BossTrackingPauseView = {
  id: string;
  startedAt: Date;
  endedAt: Date | null;
  reason: string | null;
  vodLabel: string | null;
  vodResumeSeconds: number | null;
};

export type BossTrackingSessionView = {
  id: string;
  guildId: string;
  channelId: string;
  trackerUserId: string;
  status: BossTrackingSessionStatus;
  startDeaths: number;
  deathCount: number;
  recordedDeathCount: number;
  finalDeaths: number | null;
  manualTrackedSeconds: number | null;
  vodLabel: string | null;
  vodStartSeconds: number | null;
  vodEndSeconds: number | null;
  attemptTimingStatus: BossTrackingAttemptTimingStatus;
  reconciliationNote: string | null;
  totalPausedSeconds: number;
  pausedAt: Date | null;
  startedAt: Date;
  focusedAt: Date;
  endedAt: Date | null;
  endResult: BossTrackingEndResult | null;
  notes: string | null;
  game: {
    id: string;
    name: string;
    normalizedName: string;
  };
  boss: {
    id: string;
    name: string;
    normalizedName: string;
    runbackSeconds: number | null;
    game: {
      id: string;
      name: string;
      normalizedName: string;
    };
  };
  attempts: BossTrackingAttemptView[];
  pauses: BossTrackingPauseView[];
};

export type StartLiveBossTrackingInput = {
  guildId: string;
  channelId: string;
  trackerUserId: string;
  gameName?: string | null;
  bossName: string;
  startDeaths: number;
  startedAgoSeconds?: number | null;
  aliases?: string | null;
  weakAliases?: string | null;
  contextWords?: string | null;
  vod?: string | null;
  vodTime?: string | null;
};

export type ResolveGameNameInput = {
  guildId: string;
  gameName?: string | null;
};

export type ResolveGameNameFromOptionInput = {
  guildId: string;
  gameName: string | null | undefined;
};

export type BossTopicTermsInput = {
  bossName: string;
  aliases: string[];
  weakAliases: string[];
  contextWords: string[];
};

export type GameTopicTermsInput = {
  gameName: string;
  aliases: string[];
  contextWords: string[];
};

export type BossTrackingAverageFromSecondsInput = {
  trackedSeconds: number;
  attemptCount: number;
  runbackSeconds: number;
};

export type RecordLiveBossDeathInput = {
  guildId: string;
  vodTime?: string | null;
};

export type GetBossTrackingReconciliationInput = {
  startDeaths: number;
  totalDeaths: number;
  recordedDeathCount: number;
};

export type PauseLiveBossTrackingInput = {
  guildId: string;
  reason?: string | null;
  currentDeaths?: number | null;
};

export type ResumeLiveBossTrackingInput = {
  guildId: string;
  gameName?: string | null;
  bossName?: string | null;
  vod?: string | null;
  vodTime?: string | null;
};

export type GameTrackingStatusView = {
  gameName: string;
  deaths: number;
  killedBossCount: number;
  pendingBossCount: number;
};

export type GetLiveGameTrackingStatusInput = {
  guildId: string;
  gameName?: string | null;
};

export type GetOpenBossTrackingBossAutocompleteInput = {
  guildId: string;
  gameName: string | null;
  query: string;
};

export type UpdateLiveBossInfoInput = {
  guildId: string;
  userId: string;
  gameName?: string | null;
  bossName?: string | null;
  name?: string | null;
  aliases?: string | null;
  weakAliases?: string | null;
  contextWords?: string | null;
  runbackSeconds?: number | null;
};

export type UpdateLiveGameInfoInput = {
  guildId: string;
  userId: string;
  gameName?: string | null;
  name?: string | null;
  aliases?: string | null;
  contextWords?: string | null;
};

export type EndLiveBossTrackingInput = {
  guildId: string;
  result: string;
  finalDeaths?: number;
  totalMinutes?: number;
  vodTime?: string | null;
};

export type BossTrackingAverageAttemptTime =
  | {
      seconds: number;
      reason: null;
    }
  | {
      seconds: null;
      reason: string;
    };
