import { findActiveBossTrackingSession } from '../../data/queries/boss-tracking';
import { findGuildStreamConfig } from '../../data/queries/stream-info';
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
import { normalizeBossName } from '../bosses/bosses.utils';

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

export const startLiveBossTracking = async ({
  guildId,
  channelId,
  trackerUserId,
  gameName,
  bossName,
  startDeaths,
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

  return startBossTrackingSession({
    guildId,
    channelId,
    trackerUserId,
    gameName: cleanGameName,
    normalizedGameName: normalizeBossName(cleanGameName),
    bossName: cleanBossName,
    normalizedBossName: normalizeBossName(cleanBossName),
    startDeaths,
    ...(vod?.trim() ? { vodLabel: vod.trim() } : {}),
    ...(vodStartSeconds === undefined ? {} : { vodStartSeconds }),
    topicTerms: toTopicTerms({
      bossName: cleanBossName,
      aliases: parseTopicTerms(aliases ?? null),
      weakAliases: parseTopicTerms(weakAliases ?? null),
      contextWords: parseTopicTerms(contextWords ?? null),
    }),
  });
};

export const recordLiveBossDeath = (guildId: string) =>
  recordBossTrackingDeath(guildId);

export const pauseLiveBossTracking = ({
  guildId,
  reason,
  vodTime,
}: {
  guildId: string;
  reason?: string | null;
  vodTime?: string | null;
}) => {
  const vodPauseSeconds = parseVodTimestamp(vodTime);

  return pauseBossTrackingSession({
    guildId,
    reason: reason?.trim() || null,
    ...(vodPauseSeconds === undefined ? {} : { vodPauseSeconds }),
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
  const session = await findActiveBossTrackingSession(guildId);

  if (!session) {
    throw new Error('No boss tracking session is active right now.');
  }

  return session;
};

export const updateLiveBossInfo = async ({
  guildId,
  userId,
  gameName,
  bossName,
  name,
  aliases,
  weakAliases,
  contextWords,
}: {
  guildId: string;
  userId: string;
  gameName?: string | null;
  bossName?: string | null;
  name?: string | null;
  aliases?: string | null;
  weakAliases?: string | null;
  contextWords?: string | null;
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

  if (topicTerms.length === 0 && !cleanName) {
    throw new Error('Add a name, alias, or tag.');
  }

  return updateBossTrackingInfo({
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
  });
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

export const cancelLiveBossTracking = (guildId: string) =>
  cancelBossTrackingSession(guildId);

export type BossTrackingSessionView = Awaited<
  ReturnType<typeof startLiveBossTracking>
>;
