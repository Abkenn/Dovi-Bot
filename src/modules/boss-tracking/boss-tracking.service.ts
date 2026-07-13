import { DateTime } from 'luxon';
import {
  findActiveBossTrackingSession,
  findBossTrackingStatusSession,
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
  BossTrackingEndResult,
} from '../../generated/prisma/enums';
import {
  summarizeRecentBossEncounters,
  summarizeTrackedGameStatus,
} from '../bosses/bosses.stats';
import { normalizeBossName } from '../bosses/bosses.utils';
import { invalidateCommunityTopicMatcherCache } from '../community-topics/community-topic-matcher';
import { invalidateEmbeddedAppStatsCache } from '../embedded-app/embedded-app-stats-cache.service';
import type {
  BossTopicTermsInput,
  BossTrackingSessionView,
  EndLiveBossTrackingInput,
  GameTopicTermsInput,
  GameTrackingStatusView,
  GetLiveGameTrackingStatusInput,
  GetOpenBossTrackingBossAutocompleteInput,
  PauseLiveBossTrackingInput,
  RecordLiveBossDeathInput,
  ResolveGameNameFromOptionInput,
  ResolveGameNameInput,
  ResumeLiveBossTrackingInput,
  StartLiveBossTrackingInput,
  UpdateLiveBossInfoInput,
  UpdateLiveGameInfoInput,
} from './boss-tracking.types';
import {
  getBossTrackingReconciliation,
  getBossTrackingReconciliationFromBossDeaths,
} from './boss-tracking.utils';

const assertNonEmptyName = (value: string, label: string) => {
  const trimmed = value.trim();

  if (!trimmed) {
    throw new Error(`${label} is required.`);
  }

  return trimmed;
};

const completeEmbeddedAppStatsMutation = async <Result>(
  guildId: string,
  mutation: Promise<Result>,
) => {
  const result = await mutation;
  invalidateEmbeddedAppStatsCache(guildId);
  return result;
};

const getDefaultGameName = async (guildId: string) => {
  const config = await findGuildStreamConfig(guildId);

  return config?.defaultGameName ?? null;
};

const resolveGameName = async ({ guildId, gameName }: ResolveGameNameInput) => {
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

const resolveGameNameFromOption = ({
  guildId,
  gameName,
}: ResolveGameNameFromOptionInput) => {
  if (gameName === undefined) {
    return resolveGameName({ guildId });
  }

  return resolveGameName({ guildId, gameName });
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

const findOpenOrLatestBossTrackingSession = async (guildId: string) =>
  (await findActiveBossTrackingSession(guildId)) ??
  (await findLatestBossTrackingSession(guildId));

const toTopicTerms = ({
  bossName,
  aliases,
  weakAliases,
  contextWords,
}: BossTopicTermsInput) => {
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
}: GameTopicTermsInput) => {
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
}: StartLiveBossTrackingInput): Promise<BossTrackingSessionView> => {
  const cleanGameName = await resolveGameNameFromOption({
    guildId,
    gameName,
  });
  const cleanBossName = assertNonEmptyName(bossName, 'Boss');
  const vodStartSeconds = parseVodTimestamp(vodTime);

  assertNonNegativeInteger(startDeaths, 'Starting deaths');
  const cleanStartedAgoSeconds = startedAgoSeconds ?? undefined;

  if (cleanStartedAgoSeconds !== undefined) {
    assertNonNegativeInteger(cleanStartedAgoSeconds, 'Started ago seconds');
  }

  const startSessionInput: Parameters<typeof startBossTrackingSession>[0] = {
    guildId,
    channelId,
    trackerUserId,
    gameName: cleanGameName,
    normalizedGameName: normalizeBossName(cleanGameName),
    bossName: cleanBossName,
    normalizedBossName: normalizeBossName(cleanBossName),
    startDeaths,
    topicTerms: toTopicTerms({
      bossName: cleanBossName,
      aliases: parseTopicTerms(aliases ?? null),
      weakAliases: parseTopicTerms(weakAliases ?? null),
      contextWords: parseTopicTerms(contextWords ?? null),
    }),
  };

  if (cleanStartedAgoSeconds !== undefined) {
    startSessionInput.startedAt = DateTime.utc()
      .minus({ seconds: cleanStartedAgoSeconds })
      .toJSDate();
  }

  const cleanVodLabel = vod?.trim();

  if (cleanVodLabel) {
    startSessionInput.vodLabel = cleanVodLabel;
  }

  if (vodStartSeconds !== undefined) {
    startSessionInput.vodStartSeconds = vodStartSeconds;
  }

  const session = await startBossTrackingSession(startSessionInput);

  invalidateCommunityTopicMatcherCache();
  invalidateEmbeddedAppStatsCache(guildId);

  return session;
};

export const recordLiveBossDeath = ({
  guildId,
  vodTime,
}: RecordLiveBossDeathInput) => {
  const vodDeathSeconds = parseVodTimestamp(vodTime);

  const mutation =
    vodDeathSeconds === undefined
      ? recordBossTrackingDeath({ guildId })
      : recordBossTrackingDeath({ guildId, vodDeathSeconds });

  return completeEmbeddedAppStatsMutation(guildId, mutation);
};

export const pauseLiveBossTracking = async ({
  guildId,
  reason,
  currentDeaths,
}: PauseLiveBossTrackingInput) => {
  if (currentDeaths !== null && currentDeaths !== undefined) {
    assertNonNegativeInteger(currentDeaths, 'Current deaths');
  }

  const cleanReason = reason?.trim() || null;
  const pauseInput: Parameters<typeof pauseBossTrackingSession>[0] = {
    guildId,
    reason: cleanReason,
  };

  if (currentDeaths !== null && currentDeaths !== undefined) {
    const session = await findOpenOrLatestBossTrackingSession(guildId);

    if (session) {
      pauseInput.reconciliation = getBossTrackingReconciliation({
        startDeaths: session.startDeaths,
        totalDeaths: currentDeaths,
        recordedDeathCount: session.recordedDeathCount,
      });
    }
  }

  return completeEmbeddedAppStatsMutation(
    guildId,
    pauseBossTrackingSession(pauseInput),
  );
};

export const resumeLiveBossTracking = async ({
  guildId,
  gameName,
  bossName,
  vod,
  vodTime,
}: ResumeLiveBossTrackingInput) => {
  const cleanBossName = bossName?.trim();
  const cleanGameName = cleanBossName
    ? await resolveGameNameFromOption({ guildId, gameName })
    : null;
  const vodResumeSeconds = parseVodTimestamp(vodTime);
  const resumeSessionInput: Parameters<typeof resumeBossTrackingSession>[0] = {
    guildId,
  };

  if (cleanGameName) {
    resumeSessionInput.normalizedGameName = normalizeBossName(cleanGameName);
  }

  if (cleanBossName) {
    resumeSessionInput.normalizedBossName = normalizeBossName(cleanBossName);
  }

  const cleanVodLabel = vod?.trim();

  if (cleanVodLabel) {
    resumeSessionInput.vodLabel = cleanVodLabel;
  }

  if (vodResumeSeconds !== undefined) {
    resumeSessionInput.vodResumeSeconds = vodResumeSeconds;
  }

  return completeEmbeddedAppStatsMutation(
    guildId,
    resumeBossTrackingSession(resumeSessionInput),
  );
};

export const getLiveBossTrackingStatus =
  async (): Promise<BossTrackingSessionView> => {
    const session = await findBossTrackingStatusSession();

    if (!session) {
      throw new Error('No boss tracking session has been recorded yet.');
    }

    return session;
  };

export const getLiveGameTrackingStatus = async ({
  guildId,
  gameName,
}: GetLiveGameTrackingStatusInput): Promise<GameTrackingStatusView> => {
  const cleanGameName = await resolveGameNameFromOption({
    guildId,
    gameName,
  });
  const game = await findTrackedGameStatus(normalizeBossName(cleanGameName));

  if (!game) {
    return {
      gameName: cleanGameName,
      deaths: 0,
      killedBossCount: 0,
      pendingBossCount: 0,
      recentBossEncounters: [],
    };
  }

  return {
    ...summarizeTrackedGameStatus(game),
    recentBossEncounters: summarizeRecentBossEncounters(game.bosses),
  };
};

export const getOpenBossTrackingBossAutocomplete = async ({
  guildId,
  gameName,
  query,
}: GetOpenBossTrackingBossAutocompleteInput) =>
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
  nextRunbackSeconds,
}: UpdateLiveBossInfoInput) => {
  const cleanBossName = bossName?.trim();
  const cleanGameName = cleanBossName
    ? await resolveGameNameFromOption({ guildId, gameName })
    : null;
  const topicTerms = toTopicTerms({
    bossName: '',
    aliases: parseTopicTerms(aliases ?? null),
    weakAliases: parseTopicTerms(weakAliases ?? null),
    contextWords: parseTopicTerms(contextWords ?? null),
  });
  const cleanName = name?.trim() || null;
  const cleanRunbackSeconds = runbackSeconds ?? undefined;
  const cleanNextRunbackSeconds = nextRunbackSeconds ?? undefined;

  if (cleanRunbackSeconds !== undefined) {
    assertNonNegativeInteger(cleanRunbackSeconds, 'Runback seconds');
  }

  if (cleanNextRunbackSeconds !== undefined) {
    assertNonNegativeInteger(cleanNextRunbackSeconds, 'Next runback seconds');
  }

  if (
    topicTerms.length === 0 &&
    !cleanName &&
    cleanRunbackSeconds === undefined &&
    cleanNextRunbackSeconds === undefined
  ) {
    throw new Error('Add a name, alias, tag, or runback seconds.');
  }

  const trackingInfoUpdate: Parameters<typeof updateBossTrackingInfo>[0] = {
    guildId,
    createdByUserId: userId,
    topicTerms,
  };

  if (cleanName) {
    trackingInfoUpdate.canonicalBossName = cleanName;
    trackingInfoUpdate.normalizedCanonicalBossName =
      normalizeBossName(cleanName);
  }

  if (cleanGameName) {
    trackingInfoUpdate.normalizedGameName = normalizeBossName(cleanGameName);
  }

  if (cleanBossName) {
    trackingInfoUpdate.normalizedBossName = normalizeBossName(cleanBossName);
  }

  if (cleanRunbackSeconds !== undefined) {
    trackingInfoUpdate.runbackSeconds = cleanRunbackSeconds;
  }

  if (cleanNextRunbackSeconds !== undefined) {
    trackingInfoUpdate.nextRunbackSeconds = cleanNextRunbackSeconds;
  }

  const result = await updateBossTrackingInfo(trackingInfoUpdate);

  invalidateCommunityTopicMatcherCache();
  invalidateEmbeddedAppStatsCache(guildId);

  return result;
};

export const updateLiveGameInfo = async ({
  guildId,
  userId,
  gameName,
  name,
  aliases,
  contextWords,
  deaths,
}: UpdateLiveGameInfoInput) => {
  const cleanGameName = await resolveGameNameFromOption({
    guildId,
    gameName,
  });
  const cleanAliases = parseTopicTerms(aliases ?? null);
  const cleanContextWords = parseTopicTerms(contextWords ?? null);
  const cleanName = name?.trim() || null;
  const cleanDeaths = deaths ?? undefined;
  const shouldUpdateTopicTerms =
    Boolean(cleanName) ||
    cleanAliases.length > 0 ||
    cleanContextWords.length > 0;
  const topicTerms = shouldUpdateTopicTerms
    ? toGameTopicTerms({
        gameName: cleanGameName,
        aliases: cleanAliases,
        contextWords: cleanContextWords,
      })
    : [];

  if (cleanDeaths !== undefined) {
    assertNonNegativeInteger(cleanDeaths, 'Deaths');
  }

  if (topicTerms.length === 0 && !cleanName && cleanDeaths === undefined) {
    throw new Error('Add a name, alias, tag, or deaths.');
  }

  const gameTopicInfoUpdate: Parameters<typeof updateBossGameTopicInfo>[0] = {
    guildId,
    gameName: cleanGameName,
    normalizedGameName: normalizeBossName(cleanGameName),
    createdByUserId: userId,
    topicTerms,
  };

  if (cleanName) {
    gameTopicInfoUpdate.canonicalGameName = cleanName;
    gameTopicInfoUpdate.normalizedCanonicalGameName =
      normalizeBossName(cleanName);
  }

  if (cleanDeaths !== undefined) {
    gameTopicInfoUpdate.deaths = cleanDeaths;
  }

  const result = await updateBossGameTopicInfo(gameTopicInfoUpdate);

  invalidateCommunityTopicMatcherCache();
  invalidateEmbeddedAppStatsCache(guildId);

  return result;
};

export const endLiveBossTracking = async ({
  guildId,
  result,
  bossDeaths,
  gameDeaths,
  totalMinutes,
  vodTime,
}: EndLiveBossTrackingInput) => {
  if (bossDeaths !== undefined) {
    assertNonNegativeInteger(bossDeaths, 'Boss deaths');
  }

  if (gameDeaths !== undefined) {
    assertNonNegativeInteger(gameDeaths, 'Game deaths');
  }

  if (totalMinutes !== undefined) {
    assertNonNegativeNumber(totalMinutes, 'Total minutes');
  }

  const session = await findOpenOrLatestBossTrackingSession(guildId);

  if (!session) {
    throw new Error('No boss tracking session found.');
  }

  const resolvedBossDeaths =
    bossDeaths ?? Math.max(session.deathCount, session.recordedDeathCount);
  const resolvedGameDeaths =
    gameDeaths ?? session.startDeaths + resolvedBossDeaths;

  if (resolvedGameDeaths < session.startDeaths + resolvedBossDeaths) {
    throw new Error(
      'Game deaths cannot be lower than starting deaths plus boss deaths.',
    );
  }

  const endResult =
    result === 'abandoned'
      ? BossTrackingEndResult.ABANDONED
      : BossTrackingEndResult.KILLED;
  const vodEndSeconds = parseVodTimestamp(vodTime);
  const reconciliation = getBossTrackingReconciliationFromBossDeaths({
    deathCount: resolvedBossDeaths,
    totalDeaths: resolvedGameDeaths,
    recordedDeathCount: session.recordedDeathCount,
  });
  const endInput: Parameters<typeof endBossTrackingSession>[0] = {
    guildId,
    result: endResult,
    reconciliation,
  };

  if (totalMinutes !== undefined) {
    endInput.manualTrackedSeconds = Math.round(totalMinutes * 60);
  }

  if (vodEndSeconds !== undefined) {
    endInput.vodEndSeconds = vodEndSeconds;
  }

  return completeEmbeddedAppStatsMutation(
    guildId,
    endBossTrackingSession(endInput),
  );
};

export const cancelLiveBossTracking = async (guildId: string) => {
  const session = await cancelBossTrackingSession(guildId);

  invalidateCommunityTopicMatcherCache();
  invalidateEmbeddedAppStatsCache(guildId);

  return session;
};
