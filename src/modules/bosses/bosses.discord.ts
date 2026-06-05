import type { EmbedBuilder } from 'discord.js';
import {
  BossTrackingAttemptTimingStatus,
  BossTrackingEndResult,
} from '../../generated/prisma/enums';

type BossWithDaviStats = {
  stats: {
    deaths: number | null;
    totalAttemptTimeSeconds: number | null;
    winningAttemptTimeSeconds: number | null;
    difficultyCoefficient: { toString(): string } | null;
  }[];
};

type BossWithBotTrackedStats = {
  runbackSeconds: number | null;
  trackingSessions: {
    deathCount: number;
    recordedDeathCount: number;
    endResult: BossTrackingEndResult | null;
    manualTrackedSeconds: number | null;
    attemptTimingStatus: BossTrackingAttemptTimingStatus;
    totalPausedSeconds: number;
    startedAt: Date;
    endedAt: Date | null;
  }[];
};

type BossWithStats = BossWithDaviStats & BossWithBotTrackedStats;

const formatSeconds = (seconds: number | null) => {
  if (seconds === null) {
    return null;
  }

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${remainingSeconds}s`;
  }

  return `${minutes}m ${remainingSeconds}s`;
};

const getTrackedSeconds = (
  session: BossWithBotTrackedStats['trackingSessions'][number],
) => {
  if (session.manualTrackedSeconds !== null) {
    return session.manualTrackedSeconds;
  }

  if (!session.endedAt) {
    return null;
  }

  return Math.max(
    0,
    Math.floor(
      (session.endedAt.getTime() - session.startedAt.getTime()) / 1000,
    ) - session.totalPausedSeconds,
  );
};

export const getDaviBossStatsText = (boss: BossWithDaviStats) => {
  const stats = boss.stats[0];

  if (!stats) {
    return null;
  }

  const totalTime = formatSeconds(stats.totalAttemptTimeSeconds);
  const winningTime = formatSeconds(stats.winningAttemptTimeSeconds);
  const lines = [
    stats.deaths === null ? null : `Deaths: ${stats.deaths}`,
    totalTime ? `Total attempt time: ${totalTime}` : null,
    winningTime ? `Winning attempt: ${winningTime}` : null,
    stats.difficultyCoefficient
      ? `Difficulty coefficient: ${stats.difficultyCoefficient.toString()}`
      : null,
  ].filter((line) => line !== null);

  return lines.length > 0 ? lines.join('\n') : null;
};

export const getBotTrackedBossStatsText = (boss: BossWithBotTrackedStats) => {
  const sessions = boss.trackingSessions;

  if (sessions.length === 0) {
    return null;
  }

  const deathCount = sessions.reduce(
    (sum, session) => sum + session.deathCount,
    0,
  );
  const killedCount = sessions.filter(
    (session) => session.endResult === BossTrackingEndResult.KILLED,
  ).length;
  const trustedSessions = sessions.filter(
    (session) =>
      session.attemptTimingStatus === BossTrackingAttemptTimingStatus.TRUSTED,
  );
  const trackedSeconds = trustedSessions.reduce((sum, session) => {
    const sessionSeconds = getTrackedSeconds(session);
    const runbackSeconds =
      (boss.runbackSeconds ?? 0) * session.recordedDeathCount;

    return (
      sum +
      (sessionSeconds === null
        ? 0
        : Math.max(0, sessionSeconds - runbackSeconds))
    );
  }, 0);
  const completedAttemptCount = trustedSessions.reduce(
    (sum, session) =>
      sum +
      (session.endResult === BossTrackingEndResult.KILLED
        ? session.recordedDeathCount + 1
        : session.recordedDeathCount),
    0,
  );
  const averageAttempt =
    trackedSeconds > 0 && completedAttemptCount > 0
      ? formatSeconds(Math.round(trackedSeconds / completedAttemptCount))
      : null;
  const lines = [
    `Deaths: ${deathCount}`,
    `Killed: ${killedCount > 0 ? 'Yes' : 'No'}`,
    sessions.length > 1 ? `Sessions: ${sessions.length}` : null,
    averageAttempt ? `Avg attempt: ${averageAttempt}` : null,
  ].filter((line) => line !== null);

  return lines.join('\n');
};

export const getBossStatsText = (boss: BossWithStats) => {
  const daviStats = boss.stats[0] ?? null;
  const trackedSessions = boss.trackingSessions;
  const hasDaviStats =
    daviStats !== null &&
    (daviStats.deaths !== null ||
      daviStats.totalAttemptTimeSeconds !== null ||
      daviStats.winningAttemptTimeSeconds !== null ||
      daviStats.difficultyCoefficient !== null);

  if (!hasDaviStats && trackedSessions.length === 0) {
    return null;
  }

  const trackedDeathCount = trackedSessions.reduce(
    (sum, session) => sum + session.deathCount,
    0,
  );
  const deaths =
    (daviStats?.deaths ?? 0) +
    (trackedSessions.length > 0 ? trackedDeathCount : 0);
  const trustedTrackedSessions = trackedSessions.filter(
    (session) =>
      session.attemptTimingStatus === BossTrackingAttemptTimingStatus.TRUSTED,
  );
  const trackedSeconds = trustedTrackedSessions.reduce((sum, session) => {
    const sessionSeconds = getTrackedSeconds(session);
    const runbackSeconds =
      (boss.runbackSeconds ?? 0) * session.recordedDeathCount;

    return (
      sum +
      (sessionSeconds === null
        ? 0
        : Math.max(0, sessionSeconds - runbackSeconds))
    );
  }, 0);
  const totalAttemptSeconds =
    (daviStats?.totalAttemptTimeSeconds ?? 0) + trackedSeconds;
  const daviAttemptCount =
    daviStats?.totalAttemptTimeSeconds !== null &&
    daviStats?.totalAttemptTimeSeconds !== undefined &&
    daviStats.deaths !== null
      ? daviStats.deaths + 1
      : 0;
  const trackedAttemptCount = trustedTrackedSessions.reduce(
    (sum, session) =>
      sum +
      (session.endResult === BossTrackingEndResult.KILLED
        ? session.recordedDeathCount + 1
        : session.recordedDeathCount),
    0,
  );
  const averageAttempt =
    totalAttemptSeconds > 0 && daviAttemptCount + trackedAttemptCount > 0
      ? formatSeconds(
          Math.round(
            totalAttemptSeconds / (daviAttemptCount + trackedAttemptCount),
          ),
        )
      : null;
  const lines = [
    deaths > 0 || daviStats?.deaths !== null ? `Deaths: ${deaths}` : null,
    totalAttemptSeconds > 0
      ? `Total attempt time: ${formatSeconds(totalAttemptSeconds)}`
      : null,
    averageAttempt ? `Avg attempt: ${averageAttempt}` : null,
    daviStats?.winningAttemptTimeSeconds
      ? `Winning attempt: ${formatSeconds(daviStats.winningAttemptTimeSeconds)}`
      : null,
    daviStats?.difficultyCoefficient
      ? `Difficulty coefficient: ${daviStats.difficultyCoefficient.toString()}`
      : null,
  ].filter((line) => line !== null);

  return lines.join('\n');
};

export const addDaviBossStatsField = (
  embed: EmbedBuilder,
  boss: BossWithDaviStats,
  options: { spoiler?: boolean } = {},
) => {
  const daviStats = getDaviBossStatsText(boss);
  const fieldValue =
    daviStats && options.spoiler ? `||${daviStats}||` : daviStats;

  embed.addFields({
    name: 'Davi stats',
    value: fieldValue ?? 'No Davi stats found for this boss yet.',
    inline: false,
  });

  return embed;
};

export const addBotTrackedBossStatsField = (
  embed: EmbedBuilder,
  boss: BossWithBotTrackedStats,
) => {
  embed.addFields({
    name: 'Bot-tracked stats',
    value:
      getBotTrackedBossStatsText(boss) ??
      'No bot-tracked stats found for this boss yet.',
    inline: false,
  });

  return embed;
};

export const addBossStatsField = (embed: EmbedBuilder, boss: BossWithStats) => {
  embed.addFields({
    name: 'Davi stats',
    value: getBossStatsText(boss) ?? 'No Davi stats found for this boss yet.',
    inline: false,
  });

  return embed;
};
