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

export type BossTrackingAverageAttemptTime =
  | {
      seconds: number;
      reason: null;
    }
  | {
      seconds: null;
      reason: string;
    };
