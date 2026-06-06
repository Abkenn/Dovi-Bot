import {
  findActiveBossTrackingSession,
  findLatestBossTrackingSession,
  findOpenBossTrackingBossesForAutocomplete,
  findTrackedGameStatus,
} from '../../data/queries/boss-tracking';
import { findGuildStreamConfig } from '../../data/queries/stream-info';
import { updateBossGameTopicInfo } from '../../data/transactions/boss-topic-info';
import {
  cancelBossTrackingSession,
  endBossTrackingSession,
  pauseBossTrackingSession,
  recordBossTrackingDeath,
  resumeBossTrackingSession,
  startBossTrackingSession,
  updateBossTrackingInfo,
} from '../../data/transactions/boss-tracking';
import {
  BossTopicTermKind,
  BossTrackingAttemptResult,
  BossTrackingAttemptTimingStatus,
  BossTrackingEndResult,
  BossTrackingSessionStatus,
} from '../../generated/prisma/enums';
import { normalizeBossName } from '../bosses/bosses.utils';
import { invalidateCommunityTopicMatcherCache } from '../community-topics/community-topic-matcher';

const assertNonEmptyName = (value: string, label: string) => {
  const trimmed = value.trim();

  if (!trimmed) {
    throw new Error(`${label} is required.`);
  }

  return trimmed;
};

const getDefaultGameName = async (guildId: string) => {
  const config = await findGuildStreamConfig(guildId);

  return config?.defaultGameName ?? null;
};

const resolveGameName = async ({
  guildId,
  gameName,
}: {
  guildId: string;
  gameName?: string | null;
}) => {
  const cleanGameName = gameName?.trim();

  if (cleanGameName) {
    return cleanGameName;
  }

  const defaultGameName = await getDefaultGameName(guildId);

  if (!defaultGameName) {
    throw new Error('Set the stream game first, or pass game in this command.');
  }

  return defaultGameName;
};

const assertNonNegativeInteger = (value: number, label: string) => {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${label} must be 0 or higher.`);
  }
};

const assertNonNegativeNumber = (value: number, label: string) => {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${label} must be 0 or higher.`);
  }
};

const parseVodTimestamp = (value: string | null | undefined) => {
  const cleanValue = value?.trim();

  if (!cleanValue) {
    return undefined;
  }

  const parts = cleanValue.split(':').map((part) => Number(part));
  const hasInvalidPart = parts.some(
    (part) => !Number.isInteger(part) || part < 0,
  );

  if (hasInvalidPart || parts.length < 1 || parts.length > 3) {
    throw new Error('VOD time must look like 12, 12:34, or 1:23:45.');
  }

  const [seconds = 0, minutes = 0, hours = 0] = parts.reverse();

  if (seconds >= 60 || minutes >= 60) {
    throw new Error('VOD time minutes and seconds must be under 60.');
  }

  return hours * 3600 + minutes * 60 + seconds;
};

const parseTopicTerms = (value: string | null) =>
  (value ?? '')
    .split(',')
    .map((term) => term.trim())
    .filter(Boolean);

const toTopicTerms = ({
  bossName,
  aliases,
  weakAliases,
  contextWords,
}: {
  bossName: string;
  aliases: string[];
  weakAliases: string[];
  contextWords: string[];
}) => {
  const seen = new Set<string>();

  return [
    { kind: BossTopicTermKind.ALIAS, value: bossName },
    ...aliases.map((value) => ({ kind: BossTopicTermKind.ALIAS, value })),
    ...weakAliases.map((value) => ({
      kind: BossTopicTermKind.WEAK_ALIAS,
      value,
    })),
    ...contextWords.map((value) => ({
      kind: BossTopicTermKind.CONTEXT,
      value,
    })),
  ]
    .map((term) => ({
      ...term,
      normalizedValue: normalizeBossName(term.value),
    }))
    .filter((term) => {
      if (!term.normalizedValue) {
        return false;
      }

      const key = `${term.kind}:${term.normalizedValue}`;

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    });
};

const toGameTopicTerms = ({
  gameName,
  aliases,
  contextWords,
}: {
  gameName: string;
  aliases: string[];
  contextWords: string[];
}) => {
  const seen = new Set<string>();

  return [
    { kind: BossTopicTermKind.ALIAS, value: gameName },
    ...aliases.map((value) => ({ kind: BossTopicTermKind.ALIAS, value })),
    ...contextWords.map((value) => ({
      kind: BossTopicTermKind.CONTEXT,
      value,
    })),
  ]
    .map((term) => ({
      ...term,
      normalizedValue: normalizeBossName(term.value),
    }))
    .filter((term) => {
      if (!term.normalizedValue) {
        return false;
      }

      const key = `${term.kind}:${term.normalizedValue}`;

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    });
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

const getTrackedAttemptSeconds = (
  session: BossTrackingSessionView,
  now = new Date(),
) => {
  if (session.manualTrackedSeconds !== null) {
    return session.manualTrackedSeconds;
  }

  return session.attempts.reduce((totalSeconds, attempt) => {
    if (
      attempt.result === BossTrackingAttemptResult.IN_PROGRESS &&
      session.status !== BossTrackingSessionStatus.ACTIVE
    ) {
      return totalSeconds;
    }

    const dateEnd =
      attempt.result === BossTrackingAttemptResult.IN_PROGRESS
        ? now
        : attempt.endedAt;

    if (attempt.vodStartSeconds !== null && attempt.vodEndSeconds !== null) {
      return (
        totalSeconds +
        Math.max(0, attempt.vodEndSeconds - attempt.vodStartSeconds)
      );
    }

    if (!dateEnd) {
      return totalSeconds;
    }

    return (
      totalSeconds +
      Math.max(
        0,
        Math.floor((dateEnd.getTime() - attempt.startedAt.getTime()) / 1000),
      )
    );
  }, 0);
};

const hasVodContext = (session: BossTrackingSessionView) =>
  session.vodLabel !== null ||
  session.vodStartSeconds !== null ||
  session.vodEndSeconds !== null ||
  session.attempts.some(
    (attempt) =>
      attempt.vodStartSeconds !== null || attempt.vodEndSeconds !== null,
  ) ||
  session.pauses.some(
    (pause) => pause.vodLabel !== null || pause.vodResumeSeconds !== null,
  );

const getSummaryTrackedSeconds = (session: BossTrackingSessionView) => {
  if (session.manualTrackedSeconds !== null) {
    return session.manualTrackedSeconds;
  }

  if (session.vodStartSeconds !== null && session.vodEndSeconds !== null) {
    return Math.max(0, session.vodEndSeconds - session.vodStartSeconds);
  }

  return null;
};

const hasPartialVodAttemptTiming = (session: BossTrackingSessionView) =>
  session.attempts.some((attempt) => {
    const hasVodStart = attempt.vodStartSeconds !== null;
    const hasVodEnd = attempt.vodEndSeconds !== null;

    return hasVodStart !== hasVodEnd;
  });

const wasStartedByLiveResumeWithoutVod = (
  session: BossTrackingSessionView,
  attempt: BossTrackingSessionView['attempts'][number],
) =>
  session.pauses.some((pause) => {
    if (
      !pause.endedAt ||
      pause.vodLabel !== null ||
      pause.vodResumeSeconds !== null
    ) {
      return false;
    }

    const secondsAfterResume = Math.abs(
      Math.floor(
        (attempt.startedAt.getTime() - pause.endedAt.getTime()) / 1000,
      ),
    );

    return secondsAfterResume <= 5;
  });

const hasUntimedVodAttempts = (session: BossTrackingSessionView) =>
  hasVodContext(session) &&
  session.manualTrackedSeconds === null &&
  session.attempts.some(
    (attempt) =>
      attempt.result !== BossTrackingAttemptResult.IN_PROGRESS &&
      attempt.vodStartSeconds === null &&
      attempt.vodEndSeconds === null &&
      !wasStartedByLiveResumeWithoutVod(session, attempt),
  );

const getCompletedAttemptCount = (session: BossTrackingSessionView) => {
  const completedAttempts = session.attempts.filter(
    (attempt) => attempt.result !== BossTrackingAttemptResult.IN_PROGRESS,
  );

  if (completedAttempts.length > 0) {
    return completedAttempts.length;
  }

  return session.endResult === BossTrackingEndResult.KILLED
    ? session.recordedDeathCount + 1
    : session.recordedDeathCount;
};

const getRunbackAttemptCount = (session: BossTrackingSessionView) => {
  const attempts = [...session.attempts].sort(
    (left, right) => left.attemptNumber - right.attemptNumber,
  );

  return attempts.filter((attempt, index) => {
    const previousAttempt = attempts[index - 1];

    if (
      !previousAttempt ||
      attempt.result === BossTrackingAttemptResult.IN_PROGRESS
    ) {
      return false;
    }

    if (
      attempt.vodStartSeconds !== null &&
      previousAttempt.vodEndSeconds !== null
    ) {
      return attempt.vodStartSeconds === previousAttempt.vodEndSeconds;
    }

    if (!previousAttempt.endedAt) {
      return false;
    }

    const secondsAfterPreviousAttempt = Math.floor(
      (attempt.startedAt.getTime() - previousAttempt.endedAt.getTime()) / 1000,
    );

    return secondsAfterPreviousAttempt <= 5;
  }).length;
};

const getSummaryAttemptCount = (session: BossTrackingSessionView) => {
  if (session.endResult === BossTrackingEndResult.KILLED) {
    return session.deathCount + 1;
  }

  return session.deathCount;
};

const getAverageFromSeconds = ({
  trackedSeconds,
  attemptCount,
  runbackSeconds,
}: {
  trackedSeconds: number;
  attemptCount: number;
  runbackSeconds: number;
}): BossTrackingAverageAttemptTime => {
  const adjustedSeconds = Math.max(0, trackedSeconds - runbackSeconds);

  if (adjustedSeconds <= 0 || attemptCount <= 0) {
    return { seconds: null, reason: 'not enough timed attempts' };
  }

  return {
    seconds: Math.round(adjustedSeconds / attemptCount),
    reason: null,
  };
};

export const calculateBossTrackingAverageAttemptTime = (
  session: BossTrackingSessionView,
): BossTrackingAverageAttemptTime => {
  const runbackSecondsPerAttempt = session.boss.runbackSeconds;
  const hasSummaryDeaths = session.deathCount > session.recordedDeathCount;
  const summaryTrackedSeconds = getSummaryTrackedSeconds(session);

  if (hasPartialVodAttemptTiming(session)) {
    return { seconds: null, reason: 'partial attempt times' };
  }

  if (hasSummaryDeaths) {
    if (summaryTrackedSeconds === null) {
      return { seconds: null, reason: 'missing total attempt time' };
    }

    if (runbackSecondsPerAttempt === null && session.deathCount > 0) {
      return {
        seconds: null,
        reason: 'average runback time not added',
      };
    }

    return getAverageFromSeconds({
      trackedSeconds: summaryTrackedSeconds,
      attemptCount: getSummaryAttemptCount(session),
      runbackSeconds: (runbackSecondsPerAttempt ?? 0) * session.deathCount,
    });
  }

  if (hasUntimedVodAttempts(session)) {
    return { seconds: null, reason: 'missing attempt times' };
  }

  if (session.attemptTimingStatus !== BossTrackingAttemptTimingStatus.TRUSTED) {
    return { seconds: null, reason: 'death count was reconciled' };
  }

  return getAverageFromSeconds({
    trackedSeconds: getTrackedAttemptSeconds(session),
    attemptCount: getCompletedAttemptCount(session),
    runbackSeconds:
      (runbackSecondsPerAttempt ?? 0) * getRunbackAttemptCount(session),
  });
};

export const startLiveBossTracking = async ({
  guildId,
  channelId,
  trackerUserId,
  gameName,
  bossName,
  startDeaths,
  startedAgoSeconds,
  aliases,
  weakAliases,
  contextWords,
  vod,
  vodTime,
}: {
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
}) => {
  const cleanGameName = await resolveGameName({
    guildId,
    ...(gameName === undefined ? {} : { gameName }),
  });
  const cleanBossName = assertNonEmptyName(bossName, 'Boss');
  const vodStartSeconds = parseVodTimestamp(vodTime);

  assertNonNegativeInteger(startDeaths, 'Starting deaths');
  const cleanStartedAgoSeconds = startedAgoSeconds ?? undefined;

  if (cleanStartedAgoSeconds !== undefined) {
    assertNonNegativeInteger(cleanStartedAgoSeconds, 'Started ago seconds');
  }

  const session = await startBossTrackingSession({
    guildId,
    channelId,
    trackerUserId,
    gameName: cleanGameName,
    normalizedGameName: normalizeBossName(cleanGameName),
    bossName: cleanBossName,
    normalizedBossName: normalizeBossName(cleanBossName),
    startDeaths,
    ...(cleanStartedAgoSeconds === undefined
      ? {}
      : {
          startedAt: new Date(Date.now() - cleanStartedAgoSeconds * 1000),
        }),
    ...(vod?.trim() ? { vodLabel: vod.trim() } : {}),
    ...(vodStartSeconds === undefined ? {} : { vodStartSeconds }),
    topicTerms: toTopicTerms({
      bossName: cleanBossName,
      aliases: parseTopicTerms(aliases ?? null),
      weakAliases: parseTopicTerms(weakAliases ?? null),
      contextWords: parseTopicTerms(contextWords ?? null),
    }),
  });

  invalidateCommunityTopicMatcherCache();

  return session;
};

export const recordLiveBossDeath = ({
  guildId,
  vodTime,
}: {
  guildId: string;
  vodTime?: string | null;
}) => {
  const vodDeathSeconds = parseVodTimestamp(vodTime);

  return recordBossTrackingDeath({
    guildId,
    ...(vodDeathSeconds === undefined ? {} : { vodDeathSeconds }),
  });
};

export const pauseLiveBossTracking = ({
  guildId,
  reason,
  currentDeaths,
}: {
  guildId: string;
  reason?: string | null;
  currentDeaths?: number | null;
}) => {
  if (currentDeaths !== null && currentDeaths !== undefined) {
    assertNonNegativeInteger(currentDeaths, 'Current deaths');
  }

  return pauseBossTrackingSession({
    guildId,
    reason: reason?.trim() || null,
    ...(currentDeaths === null || currentDeaths === undefined
      ? {}
      : { currentDeaths }),
  });
};

export const resumeLiveBossTracking = async ({
  guildId,
  gameName,
  bossName,
  vod,
  vodTime,
}: {
  guildId: string;
  gameName?: string | null;
  bossName?: string | null;
  vod?: string | null;
  vodTime?: string | null;
}) => {
  const cleanBossName = bossName?.trim();
  const cleanGameName = cleanBossName
    ? await resolveGameName({
        guildId,
        ...(gameName === undefined ? {} : { gameName }),
      })
    : null;
  const vodResumeSeconds = parseVodTimestamp(vodTime);

  return resumeBossTrackingSession({
    guildId,
    ...(cleanGameName
      ? { normalizedGameName: normalizeBossName(cleanGameName) }
      : {}),
    ...(cleanBossName
      ? { normalizedBossName: normalizeBossName(cleanBossName) }
      : {}),
    ...(vod?.trim() ? { vodLabel: vod.trim() } : {}),
    ...(vodResumeSeconds === undefined ? {} : { vodResumeSeconds }),
  });
};

export const getLiveBossTrackingStatus = async (guildId: string) => {
  const session =
    (await findActiveBossTrackingSession(guildId)) ??
    (await findLatestBossTrackingSession(guildId));

  if (!session) {
    throw new Error('No boss tracking session has been recorded yet.');
  }

  return session;
};

export const getLiveGameTrackingStatus = async ({
  guildId,
  gameName,
}: {
  guildId: string;
  gameName?: string | null;
}) => {
  const cleanGameName = await resolveGameName({
    guildId,
    ...(gameName === undefined ? {} : { gameName }),
  });
  const status = await findTrackedGameStatus(normalizeBossName(cleanGameName));

  if (!status) {
    return {
      gameName: cleanGameName,
      deaths: 0,
      killedBossCount: 0,
      pendingBossCount: 0,
    };
  }

  return status;
};

export const getOpenBossTrackingBossAutocomplete = async ({
  guildId,
  gameName,
  query,
}: {
  guildId: string;
  gameName: string | null;
  query: string;
}) =>
  findOpenBossTrackingBossesForAutocomplete({
    guildId,
    ...(gameName ? { normalizedGameName: normalizeBossName(gameName) } : {}),
    normalizedBossQuery: normalizeBossName(query),
  });

export const updateLiveBossInfo = async ({
  guildId,
  userId,
  gameName,
  bossName,
  name,
  aliases,
  weakAliases,
  contextWords,
  runbackSeconds,
}: {
  guildId: string;
  userId: string;
  gameName?: string | null;
  bossName?: string | null;
  name?: string | null;
  aliases?: string | null;
  weakAliases?: string | null;
  contextWords?: string | null;
  runbackSeconds?: number | null;
}) => {
  const cleanBossName = bossName?.trim();
  const cleanGameName = cleanBossName
    ? await resolveGameName({
        guildId,
        ...(gameName === undefined ? {} : { gameName }),
      })
    : null;
  const topicTerms = toTopicTerms({
    bossName: '',
    aliases: parseTopicTerms(aliases ?? null),
    weakAliases: parseTopicTerms(weakAliases ?? null),
    contextWords: parseTopicTerms(contextWords ?? null),
  });
  const cleanName = name?.trim() || null;
  const cleanRunbackSeconds = runbackSeconds ?? undefined;

  if (cleanRunbackSeconds !== undefined) {
    assertNonNegativeInteger(cleanRunbackSeconds, 'Runback seconds');
  }

  if (
    topicTerms.length === 0 &&
    !cleanName &&
    cleanRunbackSeconds === undefined
  ) {
    throw new Error('Add a name, alias, tag, or runback seconds.');
  }

  const result = await updateBossTrackingInfo({
    guildId,
    createdByUserId: userId,
    topicTerms,
    ...(cleanName
      ? {
          canonicalBossName: cleanName,
          normalizedCanonicalBossName: normalizeBossName(cleanName),
        }
      : {}),
    ...(cleanGameName
      ? { normalizedGameName: normalizeBossName(cleanGameName) }
      : {}),
    ...(cleanBossName
      ? { normalizedBossName: normalizeBossName(cleanBossName) }
      : {}),
    ...(cleanRunbackSeconds === undefined
      ? {}
      : { runbackSeconds: cleanRunbackSeconds }),
  });

  invalidateCommunityTopicMatcherCache();

  return result;
};

export const updateLiveGameInfo = async ({
  guildId,
  userId,
  gameName,
  name,
  aliases,
  contextWords,
}: {
  guildId: string;
  userId: string;
  gameName?: string | null;
  name?: string | null;
  aliases?: string | null;
  contextWords?: string | null;
}) => {
  const cleanGameName = await resolveGameName({
    guildId,
    ...(gameName === undefined ? {} : { gameName }),
  });
  const topicTerms = toGameTopicTerms({
    gameName: cleanGameName,
    aliases: parseTopicTerms(aliases ?? null),
    contextWords: parseTopicTerms(contextWords ?? null),
  });
  const cleanName = name?.trim() || null;

  if (topicTerms.length === 0 && !cleanName) {
    throw new Error('Add a name, alias, or tag.');
  }

  const result = await updateBossGameTopicInfo({
    gameName: cleanGameName,
    normalizedGameName: normalizeBossName(cleanGameName),
    createdByUserId: userId,
    topicTerms,
    ...(cleanName
      ? {
          canonicalGameName: cleanName,
          normalizedCanonicalGameName: normalizeBossName(cleanName),
        }
      : {}),
  });

  invalidateCommunityTopicMatcherCache();

  return result;
};

export const endLiveBossTracking = ({
  guildId,
  result,
  finalDeaths,
  totalMinutes,
  vodTime,
}: {
  guildId: string;
  result: string;
  finalDeaths?: number;
  totalMinutes?: number;
  vodTime?: string | null;
}) => {
  if (finalDeaths !== undefined) {
    assertNonNegativeInteger(finalDeaths, 'Final deaths');
  }

  if (totalMinutes !== undefined) {
    assertNonNegativeNumber(totalMinutes, 'Total minutes');
  }

  const endResult =
    result === 'abandoned'
      ? BossTrackingEndResult.ABANDONED
      : BossTrackingEndResult.KILLED;
  const vodEndSeconds = parseVodTimestamp(vodTime);

  return endBossTrackingSession({
    guildId,
    result: endResult,
    ...(finalDeaths === undefined ? {} : { finalDeaths }),
    ...(totalMinutes === undefined
      ? {}
      : { manualTrackedSeconds: Math.round(totalMinutes * 60) }),
    ...(vodEndSeconds === undefined ? {} : { vodEndSeconds }),
  });
};

export const cancelLiveBossTracking = async (guildId: string) => {
  const session = await cancelBossTrackingSession(guildId);

  invalidateCommunityTopicMatcherCache();

  return session;
};

export type BossTrackingSessionView = Awaited<
  ReturnType<typeof startLiveBossTracking>
>;
export type GameTrackingStatusView = Awaited<
  ReturnType<typeof getLiveGameTrackingStatus>
>;
